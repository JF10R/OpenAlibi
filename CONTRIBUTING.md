# Contributing to OpenAlibi

Thank you for improving OpenAlibi. Keep changes focused, tested, independently created, and easy to audit.

## Workflow

1. Create a focused branch.
2. Make one coherent change.
3. Add or update relevant tests.
4. Run `npm test`.
5. Open a pull request explaining the problem, behavior change, and verification.

Use English for source code, tests, documentation, commits, issues, and pull requests. User-facing additions must include English, French, and Spanish translations with matching keys.

## Rights and provenance certification

By submitting a contribution, you certify that:

- you have the right to submit the code, text, data, and assets under the repository license;
- your contribution is your original work or clearly identifies every third-party source and compatible license;
- you did not transcribe a commercial puzzle, clue set, map, case solution, illustration, or proprietary source code;
- generated material was reviewed by you and does not knowingly reproduce third-party protected content;
- new assets are recorded in `ASSET-SOURCES.md` and material new mechanics are recorded in `IP-PROVENANCE.md`.

## Engineering requirements

- Preserve deterministic generation for identical semantic inputs.
- Keep the domain core usable in both browsers and Node.js.
- Require the solver to verify exactly one solution.
- Keep all investigation rules serializable and testable.
- Maintain keyboard, touch, reduced-motion, narrow-screen, and dark-theme behavior.
- Avoid runtime dependencies unless a demonstrated need outweighs the maintenance cost.

The maintainers may ask for additional provenance evidence or decline content whose origin cannot be established.
