library(NLP)
library(openNLP)
library(quanteda)
library(quanteda.textstats)
library(nsyllable)
library(jsonlite)

# Load OpenNLP models once at startup
sent_annotator <- Maxent_Sent_Token_Annotator(language = "de")
word_annotator <- Maxent_Word_Token_Annotator(language = "de")

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
      syllablesPerWord = integer(0)
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

  # Filter out punctuation tokens
  is_word <- grepl("[[:alnum:]]", words_raw)
  words_vec <- as.character(words_raw[is_word])

  # Syllable counting via nsyllable
  if (length(words_vec) == 0) {
    return(toJSON(list(
      sentences = sentences_vec,
      words = character(0),
      syllablesPerWord = integer(0)
    ), auto_unbox = FALSE))
  }

  tok <- tokens(paste(words_vec, collapse = " "), what = "fastestword")
  syllable_counts <- nsyllable(tok)[[1]]

  # Replace NA values with 1 (default for unknown words)
  syllable_counts[is.na(syllable_counts)] <- 1L

  toJSON(list(
    sentences = sentences_vec,
    words = words_vec,
    syllablesPerWord = as.integer(syllable_counts)
  ), auto_unbox = FALSE)
}
