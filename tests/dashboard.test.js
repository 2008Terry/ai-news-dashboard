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

function createFakeDocument() {
  const elements = new Map();
  const created = [];
  const createElement = (tagName) => {
    const node = {
      tagName: tagName.toUpperCase(),
      className: '',
      textContent: '',
      dataset: {},
      attributes: {},
      children: [],
      hidden: false,
      classList: { toggle() {} },
      append(...children) { this.children.push(...children); },
      replaceChildren(...children) { this.children = children; },
      setAttribute(name, value) { this.attributes[name] = value; },
      matches(selector) { return selector === 'button[data-category]' && this.tagName === 'BUTTON' && Boolean(this.dataset.category); },
    };
    created.push(node);
    return node;
  };
  const doc = {
    createElement,
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, createElement('div'));
      return elements.get(id);
    },
    querySelectorAll(selector) { return created.filter((node) => node.matches(selector)); },
  };
  return { doc, elements };
}

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

test('renders five featured cards, overflow in the feed, and update metadata', () => {
  const { doc, elements } = createFakeDocument();
  const items = Array.from({ length: 6 }, (_, index) => item({
    id: `story-${index}`,
    title: `Story ${index}`,
    url: `https://example.com/story-${index}`,
    rank: 100 - index,
  }));

  const result = dashboard.renderDashboard({
    generatedAt: '2026-09-28T08:00:00-04:00',
    status: 'partial',
    sourceNotes: ['arXiv temporarily unavailable'],
    items,
  }, {}, doc);

  assert.equal(result.featured.length, 5);
  assert.equal(result.remaining.length, 1);
  assert.equal(elements.get('featuredGrid').children.length, 5);
  assert.equal(elements.get('feedList').children.length, 1);
  const featuredCard = elements.get('featuredGrid').children[0];
  const sourceLink = featuredCard.children[1].children[0].children[0];
  assert.equal(sourceLink.href, 'https://example.com/story-0');
  assert.equal(sourceLink.target, '_blank');
  assert.equal(sourceLink.rel, 'noopener noreferrer');
  const actions = featuredCard.children[2].children[1].children;
  assert.deepEqual(actions.map((button) => button.dataset.action), ['save', 'read']);
  assert.equal(elements.get('emptyState').hidden, true);
  assert.match(elements.get('updatedLabel').textContent, /^Updated /);
  assert.match(elements.get('statusMessage').textContent, /arXiv temporarily unavailable/);
  assert.equal(elements.get('statusMessage').hidden, false);
});

test('malformed or empty data shows an empty archive without throwing', () => {
  const { doc, elements } = createFakeDocument();
  const result = dashboard.renderDashboard({
    generatedAt: 'invalid timestamp',
    status: 'partial',
    sourceNotes: ['Source check failed'],
    items: [item({ url: 'javascript:alert(1)' })],
  }, {}, doc);

  assert.equal(result.allItems.length, 0);
  assert.equal(elements.get('emptyState').hidden, false);
  assert.equal(elements.get('updatedLabel').textContent, 'Waiting for first update');
  assert.equal(elements.get('statusMessage').hidden, false);
});
