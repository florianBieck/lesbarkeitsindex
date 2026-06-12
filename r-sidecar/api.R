library(NLP)
library(openNLP)
library(jsonlite)
library(sylly)
# Attaching (not just loading) sylly.de is required: its .onAttach hook
# registers the German "de" hyphenation patterns with sylly.
library(sylly.de)

# Load OpenNLP models once at startup
sent_annotator <- Maxent_Sent_Token_Annotator(language = "de")
word_annotator <- Maxent_Word_Token_Annotator(language = "de")
pos_annotator <- Maxent_POS_Tag_Annotator(language = "de")

# Locale-independent lowercasing for German tokens: tolower() delegates to
# the C library locale, which inside the container is not guaranteed to map
# umlauts.
to_lower_de <- function(x) {
  chartr("ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜẞ", "abcdefghijklmnopqrstuvwxyzäöüß", x)
}

# The "de" patterns implement ORTHOGRAPHIC hyphenation, which undercounts
# PHONETIC syllables in two systematic ways:
#
# 1. No split after a word-initial single letter (A|bend, o|ben,
#    U|ni-ver-si-tät): handled by the initial-vowel rule in
#    count_part_syllables() below.
# 2. No split before a word-final single letter (Fa-mi-li|e, Li-ni|e):
#    whether a final -ie is one syllable (Ma-rie, Cu-rie) or two (Li-ni-e)
#    is a lexical property — a blanket rule would break Marie/Curie — so
#    these words need the per-word corrections below. Inflected forms
#    (Li-ni-en, Fa-mi-li-en) end in a consonant and hyphenate correctly
#    as-is.
#
# Keys are matched against lowercased tokens, so they must be lowercase;
# counts are derived from the documented phonetic hyphenation.
syllable_corrections <- c(
  # word-final -ie spoken as -i-e
  "aktie" = "ak-ti-e",
  "familie" = "fa-mi-li-e",
  "folie" = "fo-li-e",
  "komödie" = "ko-mö-di-e",
  "linie" = "li-ni-e",
  "materie" = "ma-te-ri-e",
  "serie" = "se-ri-e",
  "studie" = "stu-di-e",
  "tragödie" = "tra-gö-di-e",
  # medial vowel hiatus the patterns keep together (Ra-dio|ak-ti-vi-tät)
  "radioaktivität" = "ra-di-o-ak-ti-vi-tät"
)
stopifnot(
  identical(names(syllable_corrections), to_lower_de(names(syllable_corrections))),
  identical(
    unname(gsub("-", "", syllable_corrections, fixed = TRUE)),
    names(syllable_corrections)
  )
)
correction_counts <- vapply(
  strsplit(syllable_corrections, "-", fixed = TRUE), length, integer(1)
)

# A word-initial single vowel followed by exactly ONE consonant and another
# vowel always forms its own phonetic syllable, because a single
# intervocalic consonant opens the NEXT syllable (A-ber, o-ben, ü-ber,
# I-gel). Requiring a consonant in second position keeps diphthong onsets
# out (Ei-er, Au-to).
initial_vowel_onset <- "^[aeiouäöü][bcdfghjklmnpqrstvwxyzß][aeiouäöüy]"

# Counts syllables for a vector of alphabetic tokens in ONE vectorized call
# (sylly has significant per-call overhead). Unscorable tokens fall back to
# 1, matching the previous behavior. hyphen_df() instead of hyphen_c()
# because the initial-vowel rule needs the hyphenated forms, not just the
# counts.
count_part_syllables <- function(parts) {
  counts <- rep(1L, length(parts))
  # "" or NA would abort the sylly call for the entire vector
  ok <- !is.na(parts) & nzchar(trimws(parts))
  if (!any(ok)) {
    return(counts)
  }
  hyphenated <- hyphen_df(parts[ok], hyph.pattern = "de", quiet = TRUE, cache = TRUE)
  scored <- as.integer(hyphenated$syll)
  scored[is.na(scored) | scored < 1L] <- 1L

  lower <- to_lower_de(parts[ok])
  corrected <- correction_counts[lower]
  has_correction <- !is.na(corrected)
  scored[has_correction] <- unname(corrected[has_correction])

  # Initial-vowel rule: the patterns never split after the first letter, so
  # words matching initial_vowel_onset lost exactly one syllable — UNLESS
  # the patterns split directly after the second letter (un-end-lich,
  # er-in-nern, Ab-art): such a split marks the leading vowel+consonant as
  # a real spoken syllable (usually a prefix), i.e. the initial vowel does
  # not stand alone. Known miss: false prefix splits in Fremdwörtern
  # (Ex-amen stays 2 instead of E-xa-men = 3) — add such words to
  # syllable_corrections instead of widening this rule.
  lone_initial_vowel <- !has_correction &
    grepl(initial_vowel_onset, lower) &
    substr(hyphenated$word, 3, 3) != "-"
  scored[lone_initial_vowel] <- scored[lone_initial_vowel] + 1L

  counts[ok] <- scored
  counts
}

#* Health check
#* @get /health
function() {
  list(status = "ok")
}

#* Analyze text: sentence detection, word tokenization, syllable counting
#* @post /analyze
#* @serializer contentType list(type="application/json")
function(req) {
  body <- fromJSON(req$postBody)
  text <- body$text

  # Handle empty or whitespace-only text
  if (is.null(text) || trimws(text) == "") {
    return(toJSON(list(
      sentences = character(0),
      words = character(0),
      syllablesPerWord = integer(0),
      posTags = character(0)
    ), auto_unbox = FALSE))
  }

  # Convert to NLP String
  s <- as.String(text)

  # Sentence detection
  sent_annotations <- annotate(s, sent_annotator)
  sentences_vec <- as.character(s[sent_annotations])

  # Word tokenization
  word_annotations <- annotate(s, word_annotator, sent_annotations)
  # Filter to word annotations only (not sentence annotations)
  word_annots <- word_annotations[word_annotations$type == "word"]
  # as.character: for a SINGLE annotation s[...] returns an NLP String,
  # whose `[` method cannot take the logical is_word index below
  words_raw <- as.character(s[word_annots])

  # POS tagging (on all word annotations, before punctuation filtering)
  pos_annotations <- annotate(s, pos_annotator, word_annotations)
  word_pos_annots <- pos_annotations[pos_annotations$type == "word"]
  all_pos_tags <- sapply(word_pos_annots, function(a) {
    feats <- a$features
    if (length(feats) > 0 && is.list(feats[[1]]) && !is.null(feats[[1]]$POS)) {
      feats[[1]]$POS
    } else if (!is.null(feats$POS)) {
      feats$POS
    } else {
      "UNKNOWN"
    }
  })

  # Filter out punctuation tokens
  is_word <- grepl("[[:alnum:]]", words_raw)
  words_vec <- as.character(words_raw[is_word])
  pos_tags_vec <- as.character(all_pos_tags[is_word])

  # Syllable counting via German hyphenation patterns (sylly + sylly.de).
  # Each word is split into its alphabetic parts and the part counts are
  # summed, so hyphenated compounds like "Carl-Heinrich" stay one token
  # with one total count.
  if (length(words_vec) == 0) {
    return(toJSON(list(
      sentences = sentences_vec,
      words = character(0),
      syllablesPerWord = integer(0),
      posTags = character(0)
    ), auto_unbox = FALSE))
  }

  parts_per_word <- regmatches(words_vec, gregexpr("[[:alpha:]]+", words_vec))
  part_counts <- count_part_syllables(unlist(parts_per_word, use.names = FALSE))
  word_of_part <- rep.int(seq_along(words_vec), lengths(parts_per_word))
  # Words without any alphabetic part (e.g. "123") count as 1, as before
  syllable_counts <- rep(1L, length(words_vec))
  if (length(word_of_part) > 0) {
    part_sums <- vapply(split(part_counts, word_of_part), sum, integer(1))
    syllable_counts[as.integer(names(part_sums))] <- part_sums
  }

  toJSON(list(
    sentences = sentences_vec,
    words = words_vec,
    syllablesPerWord = as.integer(syllable_counts),
    posTags = pos_tags_vec
  ), auto_unbox = FALSE)
}
