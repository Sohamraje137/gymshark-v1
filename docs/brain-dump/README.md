# Coach's Claude agent export ("brain dump")

Put the coach's existing Claude agent material here, one file per topic if possible:

- `system-prompt.md`: the agent's instructions or persona.
- `knowledge/`: documents, templates, check-in questionnaires, meal or training frameworks.
- `examples/`: real (anonymised) conversations, check-in reviews, plans the agent produced.
- `sheets/`: the Excel/CSV progress trackers (export as CSV, or drop the .xlsx).
- `hevy/`, `cronometer/`: sample exports (Hevy CSV, Cronometer "Export data" CSVs).

Remove client names, emails and other personal data before committing. This folder is in git.

## How agents should use it

1. Read everything here and write `docs/brain-dump/ANALYSIS.md`. It should cover the coach's workflow, which data they collect and when,
   recurring decisions they make, and the questions they ask clients.
2. Map each item to the existing models (`src/models/`) and pages, and list the gaps.
3. Turn the gaps into roadmap items in `docs/ROADMAP.md`, ordered by value to the coach.
