/**
 * Extracts the first line of the text as the heading.
 * Returns the trimmed first line, or empty string if text is empty.
 */
export function extractHeadingText(text: string): string {
  const firstNewline = text.indexOf('\n');
  const firstLine = firstNewline === -1 ? text : text.slice(0, firstNewline);
  return firstLine.trim();
}

/**
 * Splits R-sidecar sentences into body sentences (counted as sentences)
 * and heading sentences (excluded from sentence count but words still count).
 *
 * A sentence matches the heading if its text (after trimming and optional
 * trailing punctuation removal) equals the heading text.
 */
export function filterHeadingSentences(
  sentences: readonly string[],
  headingText: string,
): { readonly bodySentences: readonly string[]; readonly headingSentences: readonly string[] } {
  if (!headingText) {
    return { bodySentences: sentences, headingSentences: [] };
  }

  const normalizedHeading = headingText.trim();
  const bodySentences: string[] = [];
  const headingSentences: string[] = [];
  let headingFound = false;

  for (const sentence of sentences) {
    if (!headingFound) {
      const trimmed = sentence.trim();
      const withoutPunctuation = trimmed.replace(/[.!?]+$/, '');
      if (trimmed === normalizedHeading || withoutPunctuation === normalizedHeading) {
        headingSentences.push(sentence);
        headingFound = true;
        continue;
      }
    }
    bodySentences.push(sentence);
  }

  return { bodySentences, headingSentences };
}
