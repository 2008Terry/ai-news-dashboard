# Signal / AI Fieldnotes

A personal AI news dashboard for frontier labs, startups, and research. The page is a static, local-first site: articles open at their original publisher, while read and saved state stays in this browser.

## Open the dashboard

Open `index.html` in a desktop browser. No build step, server, account, or API key is required. The first-run dataset is in `data/news-data.js`.

Use the left navigation to filter by topic or date. Search covers headlines, sources, summaries, and categories. **All dates** shows the archive, and **Saved stories** searches across all dates. Read and save state persists in browser local storage.

## Daily update

The update workflow is documented in [`docs/daily-update-prompt.md`](docs/daily-update-prompt.md). A Codex desktop task researches the previous 24 hours, curates up to five featured stories, and updates only `data/news-data.js` while retaining the archive. This project is configured to run daily at 8:00 AM local time.

Scheduled updates run on this computer and require the Codex desktop app and computer to be available. The page always shows the last dataset update, so missed runs leave the most recent saved edition readable.

## Data format

The page loads a JavaScript object assigned to `window.AI_NEWS_DATA`. Each item has an ID, local-calendar date, publication timestamp, title, source, category, short English summary, original URL, and featured flag. Categories are `frontier_models`, `startups_products`, and `research_science`. For exact fields and update rules, see the update prompt.

## Privacy and scope

This version has no analytics, network requests for page content, external model API, or server. The public repository contains the application and sample article metadata; browser reading state is stored separately in local storage. Hosting and phone access are not included.
