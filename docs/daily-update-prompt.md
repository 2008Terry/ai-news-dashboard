# Daily update instructions

Update this personal AI news dashboard once per day. Follow the local project instructions, then update **only** `data/news-data.js`. Do not change the page, styles, tests, or this prompt.

## Editorial brief

Find the most important AI developments published in the previous 24 hours, using the computer's local time. Cover:

- Frontier models, capabilities, safety, infrastructure, and research from OpenAI, Anthropic, Google DeepMind/Google, Meta, Microsoft, xAI, NVIDIA, and other model-building labs.
- AI startups, funding, products, acquisitions, and meaningful deployment news. Include US, Europe, China, and other Asia-Pacific companies.
- Research papers and scientific applications, including AI4Science, biology, chemistry, materials, climate, medicine, robotics, and interdisciplinary work.

Use primary sources where possible: company blogs and release notes, research labs, paper pages, arXiv, Hugging Face Daily Papers, conference proceedings, and startup announcements. For independent coverage, check Reuters, TechCrunch, The Information, MIT Technology Review, IEEE Spectrum, and Ben's Bites. Check Chinese and regional sources when they add original reporting; translate the summary into clear English.

Suggested source starting points include OpenAI News, Anthropic Newsroom, Google DeepMind Blog, Meta AI, Microsoft Research, NVIDIA Newsroom, Hugging Face Daily Papers, arXiv (cs.AI, cs.LG, stat.ML, and relevant science categories), TechCrunch AI, Reuters Technology, and Ben's Bites. Treat these as a starting set, not an exhaustive whitelist.

## Selection and data rules

1. Verify every selected story and its publication date by opening the source page. Do not infer a date from a search snippet. Prefer a direct announcement or paper link; use a reputable article when no primary source exists.
2. Select up to five highest-signal items as `featured: true`, ranked by editorial importance using descending integer `rank`. Use fewer than five when fewer than five stories meet the quality bar. Keep other relevant items in the broader feed with `featured: false`.
3. Write concise, factual English summaries in one or two sentences. Include why the item matters only when the source supports the framing. Do not reproduce article text.
4. Assign exactly one category: `frontier_models`, `startups_products`, or `research_science`.
5. Use the publication date in the computer's local calendar as `date` (`YYYY-MM-DD`). Preserve the source's timestamp and time zone in ISO 8601 `publishedAt` when available. A missing timestamp may be an empty string.
6. Create a stable ID from the organization or paper, a short slug, and original publication date. Deduplicate stories by canonical URL and by substantially identical headline; syndicated copies should not appear as separate stories.
7. Read the existing `data/news-data.js` before editing. Preserve all historical items and personal IDs. Replace an old item only to correct factual metadata or a broken link. New stories should be prepended; do not rewrite old summaries just for style.
8. Set `generatedAt` to the current local time in ISO 8601. Set `status` to `complete` only if the main source groups were checked. Otherwise use `partial` and explain each meaningful source failure in `sourceNotes`. If research turns up no qualifying items, retain all existing items and still advance `generatedAt`.
9. Write valid JavaScript in the exact shape below. Do not use Markdown fences in the file, add dependencies, or fetch/save article bodies.

```js
window.AI_NEWS_DATA = {
  generatedAt: 'ISO-8601 timestamp',
  status: 'complete',
  sourceNotes: [],
  items: [
    {
      id: 'stable-id',
      date: 'YYYY-MM-DD',
      publishedAt: 'ISO-8601 timestamp',
      title: 'Original headline or faithful English translation',
      source: 'Publisher or organization',
      category: 'frontier_models',
      summary: 'One or two factual English sentences.',
      url: 'https://direct-source-link',
      featured: true,
      rank: 100,
    },
  ],
};
```

After writing, validate that all records have unique IDs, direct HTTP(S) links, valid dates, allowed categories, and boolean `featured` fields. Confirm history is still present, duplicates are absent, and the file remains parseable. Report briefly what changed and any source gaps; never claim an inaccessible source was checked.
