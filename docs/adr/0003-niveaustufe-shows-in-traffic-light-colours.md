# Niveaustufe shows in traffic-light colours

Teachers need a quick visual read of the [[Niveaustufe]] (1–5,
[ADR 0001](./0001-lue-lix-adds-a-wk-surcharge-to-the-lix.md) point 4). For that, the five levels
are grouped into three traffic-light colours.

Decision (2026-06-24): levels 1–2 → green (PrimeVue severity `success`), level 3 → amber
(`warn`), levels 4–5 → red (`error`). The grouping and the German level labels live in a pure
frontend module (`utils/niveaustufe.ts`) as the single source; the gauge, text and icon colours
in the result view all derive from that one `severity`.

Level 3 is **amber**, not pure yellow: better contrast on white (WCAG AA, a brand requirement)
and the same colour on gauge and label. Before, the gauge (`--p-yellow-500`) and the hero text
(`text-amber-700`) disagreed for the same level.

Level labels: 1 „Sehr leicht lesbar", 2 „Leicht lesbar", 3 „Mittelschwer",
4 „Eher schwer lesbar", 5 „Schwer lesbar". Values outside 1–5 fall back defensively to level 5
(red); the backend only sends 1–5.

## Considered options

- **Yellow for level 3** (green/yellow/red taken literally): weaker contrast on white, and the
  gauge/label mismatch would remain.
- **A colour per level** (five colours): overloaded; the three-colour traffic light is the
  established reading heuristic, and it can be grouped in a colourblind-safe way.
- **Keep the severity in the backend / api-client**: `success/warn/error` is PrimeVue
  vocabulary and the labels are German UI text; both belong in the interface, not in the data
  contract. The backend only assigns the number.

## Consequences

- The grouping is a subject-matter decision; it can be adjusted together with BL, the
  subject-matter lead, if needed, and then only the table in `utils/niveaustufe.ts` changes.
- The gauge colour for level 3 visibly changes from yellow to amber.
- WCAG AA: amber and red must meet the contrast requirement on a white background.
