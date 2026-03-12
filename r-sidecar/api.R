library(NLP)
library(openNLP)
library(quanteda)
library(quanteda.textstats)

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
#* @serializer json
function(req) {
  body <- jsonlite::fromJSON(req$postBody)
  text <- body$text

  # Handle empty or whitespace-only text
  if (is.null(text) || trimws(text) == "") {
    return(list(
      sentences = list(),
      words = list(),
      syllablesPerWord = list()
    ))
  }

  # Convert to NLP String
  s <- as.String(text)

  # Sentence detection
  sent_annotations <- annotate(s, sent_annotator)
  sentences <- s[sent_annotations]

  # Word tokenization
  word_annotations <- annotate(s, word_annotator, sent_annotations)
  # Filter to word annotations only (not sentence annotations)
  word_annots <- word_annotations[word_annotations$type == "word"]
  words_raw <- s[word_annots]

  # Filter out punctuation tokens
  is_word <- grepl("[[:alnum:]]", words_raw)
  words <- words_raw[is_word]

  # Syllable counting via quanteda.textstats
  if (length(words) == 0) {
    return(list(
      sentences = as.list(as.character(sentences)),
      words = list(),
      syllablesPerWord = list()
    ))
  }

  tok <- tokens(paste(words, collapse = " "), what = "fastestword")
  syllable_counts <- nsyllable(tok)[[1]]

  list(
    sentences = as.list(as.character(sentences)),
    words = as.list(as.character(words)),
    syllablesPerWord = as.list(as.integer(syllable_counts))
  )
}
