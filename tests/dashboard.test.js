const test = require('node:test');
const assert = require('node:assert/strict');

let dashboard;
try {
  dashboard = require('../app.js');
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
}

const item = (overrides = {}) => ({
  id: 'openai-release',
  date: '2026-09-28',
  publishedAt: '2026-09-28T12:00:00Z',
  title: 'A frontier model update',
  source: 'OpenAI',
  category: 'frontier_models',
  summary: 'A concise summary of the announcement.',
  url: 'https://openai.com/news/model-update/',
  featured: true,
  ...overrides,
});

test('validates complete news items and rejects unsafe links', () => {
  assert.equal(typeof dashboard?.isValidItem, 'function');
  assert.equal(dashboard.isValidItem(item()), true);
  assert.equal(dashboard.isValidItem(item({ url: 'javascript:alert(1)' })), false);
  assert.equal(dashboard.isValidItem(item({ date: 'yesterday' })), false);
});

test('deduplicates canonical URLs and repeated headlines', () => {
  assert.equal(typeof dashboard?.deduplicateItems, 'function');
  const records = [
    item(),
    item({ id: 'same-url', url: 'https://openai.com/news/model-update/?utm_source=mail' }),
    item({ id: 'same-headline', url: 'https://example.com/covered-copy' }),
    item({ id: 'different', title: 'A new robotics paper', url: 'https://arxiv.org/abs/2609.11111' }),
  ];
  assert.deepEqual(dashboard.deduplicateItems(records).map((record) => record.id), [
    'openai-release',
    'different',
  ]);
});

test('filters by category, date, text, and saved state', () => {
  assert.equal(typeof dashboard?.filterItems, 'function');
  const records = [
    item(),
    item({
      id: 'science-paper',
      title: 'AI for materials discovery',
      source: 'arXiv',
      category: 'research_science',
      featured: false,
      url: 'https://arxiv.org/abs/2609.22222',
    }),
  ];

  assert.deepEqual(
    dashboard.filterItems(records, { category: 'research_science' }).map((record) => record.id),
    ['science-paper'],
  );
  assert.deepEqual(
    dashboard.filterItems(records, { date: '2026-09-27' }),
    [],
  );
  assert.deepEqual(
    dashboard.filterItems(records, { query: 'MATERIALS' }).map((record) => record.id),
    ['science-paper'],
  );
  assert.deepEqual(
    dashboard.filterItems(records, { savedOnly: true }, { savedIds: new Set(['science-paper']) })
      .map((record) => record.id),
    ['science-paper'],
  );
});

test('limits the featured section to the five highest ranked stories', () => {
  assert.equal(typeof dashboard?.topFeatured, 'function');
  const records = Array.from({ length: 7 }, (_, index) =>
    item({ id: `story-${index}`, rank: 100 - index, featured: true }),
  );
  assert.deepEqual(dashboard.topFeatured(records).map((record) => record.id), [
    'story-0',
    'story-1',
    'story-2',
    'story-3',
    'story-4',
  ]);
});

test('chooses the latest available briefing date by default', () => {
  assert.equal(typeof dashboard?.getLatestDate, 'function');
  assert.equal(dashboard.getLatestDate([
    item({ id: 'older', date: '2026-09-27' }),
    item({ id: 'newer', date: '2026-09-28' }),
  ]), '2026-09-28');
  assert.equal(dashboard.getLatestDate([]), 'all');
});

test('persists read and saved IDs through the supplied storage interface', () => {
  assert.equal(typeof dashboard?.createStateStore, 'function');
  const data = new Map();
  const storage = {
    getItem(key) { return data.get(key) ?? null; },
    setItem(key, value) { data.set(key, value); },
  };
  const store = dashboard.createStateStore(storage);
  store.toggleRead('story-1');
  store.toggleSaved('story-2');
  const reloaded = dashboard.createStateStore(storage).getState();
  assert.equal(reloaded.readIds.has('story-1'), true);
  assert.equal(reloaded.savedIds.has('story-2'), true);
  assert.equal(reloaded.savedIds.has('story-1'), false);
});

test('saved view clears a specific date so saved stories can span the archive', () => {
  assert.equal(typeof dashboard?.toggleSavedFilter, 'function');
  const filtered = dashboard.toggleSavedFilter({ date: '2026-09-28', savedOnly: false });
  assert.deepEqual(filtered, { date: 'all', savedOnly: true });
  assert.deepEqual(dashboard.toggleSavedFilter(filtered), { date: 'all', savedOnly: false });
});
