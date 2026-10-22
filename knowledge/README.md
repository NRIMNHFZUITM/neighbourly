# Assistant knowledge base

The Neighbourly Assistant answers from these Markdown files.

- Each file starts with front matter (`title`, `path`, `pathLabel`, `keywords`).
- Each `## ` heading becomes one searchable chunk, so write one question per heading and answer it fully under that heading.
- `keywords` should include common Bahasa Melayu terms, so questions in Malay still find the right section.
- After editing, run `npm run kb:build`. This regenerates `packages/shared/src/kb/kb.generated.ts`, and `npm run dev` and `npm run build` also run it.

**Sample content.** Opening hours, rules and facility details here are illustrative content written for the hackathon prototype. Replace them with official information from City of Elmina township management before any real use.
