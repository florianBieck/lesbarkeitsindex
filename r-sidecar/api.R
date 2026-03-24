library(NLP)
library(openNLP)
library(quanteda)
library(quanteda.textstats)
library(nsyllable)
library(jsonlite)

# Load OpenNLP models once at startup
sent_annotator <- Maxent_Sent_Token_Annotator(language = "de")
word_annotator <- Maxent_Word_Token_Annotator(language = "de")
pos_annotator <- Maxent_POS_Tag_Annotator(language = "de")

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
  words_raw <- s[word_annots]

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

  # Syllable counting via nsyllable (per-word to avoid misalignment from
  # re-tokenization splitting compound words like "Carl-Heinrich")
  if (length(words_vec) == 0) {
    return(toJSON(list(
      sentences = sentences_vec,
      words = character(0),
      syllablesPerWord = integer(0),
      posTags = character(0)
    ), auto_unbox = FALSE))
  }

  syllable_counts <- integer(length(words_vec))
  for (i in seq_along(words_vec)) {
    word <- words_vec[i]
    # Strip hyphens and non-alpha chars, then split into alpha parts for syllable counting
    parts <- unlist(regmatches(word, gregexpr("[[:alpha:]]+", word)))
    if (length(parts) == 0) {
      syllable_counts[i] <- 1L
    } else {
      tok <- tokens(paste(parts, collapse = " "), what = "fastestword")
      counts <- nsyllable(tok)[[1]]
      counts[is.na(counts)] <- 1L
      syllable_counts[i] <- sum(counts)
    }
  }

  toJSON(list(
    sentences = sentences_vec,
    words = words_vec,
    syllablesPerWord = as.integer(syllable_counts),
    posTags = pos_tags_vec
  ), auto_unbox = FALSE)
}
