# AI News Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local browser dashboard with daily Codex-curated AI news, featured items, a searchable archive, and per-item read/save controls.

**Architecture:** A dependency-free static page loads `data/news-data.js` as a script so it works from a local file path. The Codex desktop scheduled task updates that data file daily while preserving history; browser local storage keeps read and saved state.

**Tech Stack:** HTML, CSS, browser JavaScript, Codex desktop Scheduled tasks. No package installation or separate model API key.

**Spec:** `docs/superpowers/specs/2026-09-28-ai-news-dashboard-design.md`

## Global Constraints

- The dashboard is local-first; phone access and hosting are deferred.
- English titles and summaries link directly to their original sources.
- Put exactly the five highest-signal stories at the top; keep all other relevant items from the initial source set below and preserve historical items across updates.
- Use `frontier_models`, `startups_products`, and `research_science` as the top-level categories.
- The daily update uses Codex desktop at 8:00 AM local time and requires the computer and app to be running.
- Use no paid-source API or separate OpenAI model API key in v1.

## Review Focus

- An empty first-run data file must show a useful setup/empty state instead of a broken page.
- Missing or malformed generated data must not crash the dashboard.
- Repeated/syndicated stories must not crowd out distinct featured items.
- Missing timestamps, categories, or source metadata must render safely.
- Local read/save state must survive data refreshes and page reloads.

---

### Task 1: Static dashboard shell and data contract

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `app.js`
- Create: `data/news-data.js`

**Interfaces:**
- `data/news-data.js` assigns `window.AI_NEWS_DATA = { generatedAt, status, sourceNotes, items }`.
- Each item uses `{ id, date, publishedAt, title, source, category, summary, url, featured }`.
- `app.js` reads this object and renders the dashboard without network requests.
- `isValidItem(item)` returns `true` only when all required string fields are present, `date` is `YYYY-MM-DD`, `url` is an absolute HTTP(S) URL, and `featured` is boolean.

- [ ] **Step 1: Create an empty-state fixture and data validation helper**

Add `isValidItem(item)` in `app.js` and an initial empty data object in `data/news-data.js`. Required item fields are `id`, `date`, `title`, `source`, `category`, `summary`, and `url`; malformed items are skipped.

- [ ] **Step 2: Verify empty and malformed data behavior**

Open `index.html` in a browser with empty data, then add one intentionally malformed item and reload. Expected: the page shows an empty state in both cases and no uncaught script error.

- [ ] **Step 3: Implement the semantic page shell and responsive styles**

Add a compact header with dashboard title, selected date, last-updated/status text, search control, topic filters, a featured section, and a broader news list. Keep source links prominent and open them in a new tab.

- [ ] **Step 4: Render valid featured and non-featured cards**

Implement `renderDashboard(data, state)` in `app.js`. Render at most five valid `featured: true` items first, then all other valid items below with source, timestamp, category, summary, and original URL. If more than five items are marked featured, retain the top five by item rank and render the rest in the broader feed.

- [ ] **Step 5: Verify card rendering in desktop and narrow layouts**

Open the page with representative data in a desktop browser and a narrow viewport. Expected: featured cards appear first, all required metadata is readable, and links open their article.

### Task 2: Browsing, archive, and personal state

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.js`

**Interfaces:**
- `renderDashboard(data, state)` accepts `{ query, category, date, savedOnly }` and local read/save maps.
- Persist read and saved IDs under versioned local-storage keys so data refreshes do not clear user state.

- [ ] **Step 1: Add filtering behavior**

Filter valid items by date, category, and case-insensitive search across title, source, summary, and category. Add an all-dates archive option and a saved-only view.

- [ ] **Step 2: Add read and save controls**

Add an explicit read toggle and save toggle to every card. Persist both states locally by stable item ID and update the card immediately after interaction.

- [ ] **Step 3: Verify filters and state persistence**

Manually check date navigation, each category, text search, saved-only mode, read toggling, and reload persistence. Expected: each filter composes with the others and saved/read state remains after reload.

### Task 3: Daily Codex update workflow and archive-safe data

**Files:**
- Modify: `data/news-data.js`
- Create: `docs/daily-update-prompt.md`

**Interfaces:**
- The scheduled task writes the `window.AI_NEWS_DATA` object using the Task 1 schema.
- Dataset metadata uses `generatedAt`, `status` (`complete` or `partial`), and `sourceNotes` (list of sources that could not be checked).

- [ ] **Step 1: Define the Codex update prompt**

In `docs/daily-update-prompt.md`, specify the source groups from the design, a recent-news window of the previous 24 hours, exactly five featured items, one- or two-sentence English summaries, direct links, deduplication, and preservation of existing historical entries. Ask the task to report any inaccessible sources rather than inventing stories.

- [ ] **Step 2: Create and seed the data file**

Populate `data/news-data.js` with the schema and a small set of currently verified items from primary or reputable sources so the first page view is useful. Preserve source attribution and do not copy article bodies.

- [ ] **Step 3: Verify update compatibility and preservation**

Run the update workflow once manually. Expected: the page renders the new items, existing dates remain present, duplicate URLs are collapsed, and source failures are visible in status metadata.

- [ ] **Step 4: Configure the recurring Codex task**

Create a local Codex desktop scheduled task for every day at 8:00 AM local time, using `docs/daily-update-prompt.md` and writing only `data/news-data.js`. Keep the task scoped to research and data updates; it must not alter the page code.

### Task 4: End-to-end acceptance review

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.js`
- Modify: `data/news-data.js`
- Modify: `docs/daily-update-prompt.md`

**Interfaces:**
- The page consumes the generated data contract from Task 1.
- The scheduled prompt produces only valid data records and status metadata.

- [ ] **Step 1: Run the complete acceptance checklist**

Verify featured-first ordering, complete feed visibility, original links, date/category/search filters, read/save persistence, old-item retention, duplicate removal, and partial-source status.

- [ ] **Step 2: Verify missed-run behavior**

With the page open, simulate a missed or failed update by leaving the old data file in place or setting `status: "partial"`. Expected: prior news remains readable and the last generation time/status is visible.

- [ ] **Step 3: Open the dashboard in Codex**

Use the local HTML file as the preview target and leave the editor/browser view available for the user.
