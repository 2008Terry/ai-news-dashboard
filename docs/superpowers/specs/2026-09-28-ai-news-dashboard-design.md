# AI News Dashboard Design

## Goal

Build a personal, local-first browser dashboard that gathers global AI news each day, puts the most important items first, and keeps the rest available to browse by date and topic.

## Audience and success

The dashboard is for one reader who wants to follow frontier model labs, AI startups and products, and AI research including AI for Science. Sources and card copy are English-first. The reader opens original sources from the dashboard. A useful day has a small featured section plus a broader list of relevant items.

## Product behavior

- Open a local HTML page in a desktop browser. Phone access and public hosting are deferred.
- Show the five highest-signal stories first, then all other relevant items found from the initial source set. Include date navigation, topic filters, text search, read state, and saved items.
- Use three top-level topics: `frontier_models`, `startups_products`, and `research_science`.
- Each item shows its headline, publisher, publication time, topic, a one- or two-sentence English summary, and a direct source link.
- Keep previously collected items when a new daily update is written. Show the last successful update and any source-access limitations.
- Use a daily Codex desktop scheduled task at 8:00 AM local time to discover, deduplicate, classify, rank, summarize, and update local data. The desktop app and computer must be running for the task to run.

## Initial coverage

- Official releases and research from frontier model developers, including OpenAI, Anthropic, Google DeepMind, Meta, Microsoft, Mistral, DeepSeek, Alibaba/Qwen, Moonshot/Kimi, MiniMax, and Zhipu/GLM.
- AI startup and product coverage from sources such as TechCrunch and Ben's Bites, with relevant global and China/Asia items included.
- Research discovery from Hugging Face Daily Papers and arXiv, including machine learning and selected cross-disciplinary science work (for example biology, chemistry, materials, climate, and robotics).
- Prefer primary sources for factual claims. Secondary coverage must link to the reporting source. Do not reproduce full articles.

## Data and curation

The scheduled task maintains a local JavaScript data file loaded by the HTML page, avoiding a web server or application API in v1. Each item has a stable ID, date, publication timestamp, title, publisher, category, concise English summary, canonical URL, and featured flag. Dataset metadata records generation time and any incomplete source checks. Keep prior items when adding a new date and deduplicate syndicated copies by canonical URL and story similarity.

## Out of scope

- Cloud hosting, phone access, subscriptions to paid source APIs, and automatic email delivery.
- A separate model API key. The scheduled Codex task performs curation with the user's available Codex access.
- Full-text republication or claiming exhaustive coverage of every AI story and research paper.

## Runtime constraint

Codex desktop scheduled tasks operate on the local project when configured for local execution. The computer and Codex desktop app need to remain running. If an update is missed, the user can run the task manually.
