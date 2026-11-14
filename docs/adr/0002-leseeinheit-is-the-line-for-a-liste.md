# Leseeinheit is the line for a Liste

The LIX needs the sentence as its reference unit, but reading lists (words, phrases and sometimes
whole sentences, mixed) have no consistent sentence structure. Without special handling, every
tool produces nonsense: our sentence detection sees a whole list as one giant sentence (the LIX
explodes), and RATTE counts every word as a sentence (the LIX collapses).

Decision (2026-06-11, following BL's proposal): texts have a **Texttyp** (Fließtext or Liste)
with a matching **Leseeinheit**: the sentence for Fließtext, the line for a Liste, because a
child reads a list line by line. The Texttyp is detected heuristically (many lines without
sentence-ending punctuation → Liste), but the user can override it with a visible switch. When
the Leseeinheit is the line, every sentence-based value is labelled accordingly; only values
computed with the sentence as the Leseeinheit are called „LIX nach Bamberger".

## Considered options

- **No LIX for a Liste** (show only the individual factors): honest, but teachers lose any
  overall rating, and mixed forms such as the list „Sommer" fall through the cracks entirely.
- **Only a manual switch, without detection**: whoever overlooks it keeps getting absurd
  values, which is too unforgiving for the audience.
