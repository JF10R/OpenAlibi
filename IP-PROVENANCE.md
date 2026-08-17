# OpenAlibi IP provenance

This file records how OpenAlibi's original code, rules, text, and visual assets were produced. It is an engineering provenance log, not legal advice or a freedom-to-operate opinion.

## Project origin

- Project: OpenAlibi
- Repository implementation date: July 2026 onward, as recorded in Git history
- Generator format documented here: version 6
- Implementation: original dependency-free HTML, CSS, and JavaScript maintained in this repository
- Verification: deterministic procedural generation and an original constraint-satisfaction solver in `src/core.js`

## Mechanics and representations

| Element | Origin and record |
|---|---|
| Deterministic case generator | Implemented directly for OpenAlibi; seed inputs and generator-version changes are recorded in Git. |
| CSP solution validation | Implemented directly for OpenAlibi; tests require exactly one spatial solution. |
| Investigation archetypes | OpenAlibi-specific `coPresence`, `evidenceTrail`, and `restrictedAccess` rule contracts introduced in generator version 6. |
| Spatial constraint DSL | OpenAlibi-specific serializable clue records and evaluator registry in `src/core.js`. |
| Multi-cell objects | OpenAlibi entity model with anchor, footprint, occupiable mask, orientation, and room identity. |
| Player working state | OpenAlibi per-character exclusions, candidates, trial placements, bounded undo/redo, and local draft format. |

No commercial puzzle, clue text, map, or case solution should be transcribed into this repository. Abstract logic-game conventions may be implemented only through independently written code, wording, rules, tests, and visual expression.

## Text and localization

English, French, and Spanish interface text, generated clue templates, names, and accessibility labels are maintained as repository source in `src/i18n.js`. Changes must identify their author through Git history and must not reproduce third-party puzzle text.

## Visual assets

All shipped object drawings are inline SVG source in `src/app.js`. Room surfaces are procedural CSS. See `ASSET-SOURCES.md` for the asset-level inventory.

## Contribution record

By contributing, authors make the certification described in `CONTRIBUTING.md`. Pull requests should state whether they add code, mechanics, prose, translations, puzzles, or visual assets and provide source/licensing details for anything not created specifically for OpenAlibi.

## Release checklist

- Confirm new mechanics and wording were independently created.
- Record the source and license of every new asset.
- Retain editable source and Git history.
- Do not market the project through another puzzle product's name.
- Obtain qualified trademark and freedom-to-operate advice before material commercialization.
