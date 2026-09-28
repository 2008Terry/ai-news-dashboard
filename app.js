(function attachDashboard(root) {
  const CATEGORIES = new Set(['frontier_models', 'startups_products', 'research_science']);
  const REQUIRED_STRINGS = ['id', 'date', 'title', 'source', 'category', 'summary', 'url'];

  function isValidItem(item) {
    if (!item || typeof item !== 'object') return false;
    if (REQUIRED_STRINGS.some((key) => typeof item[key] !== 'string' || !item[key].trim())) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) return false;
    const parsedDate = new Date(`${item.date}T00:00:00Z`);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== item.date) return false;
    if (!CATEGORIES.has(item.category) || typeof item.featured !== 'boolean') return false;
    try {
      const url = new URL(item.url);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function canonicalUrl(rawUrl) {
    try {
      const url = new URL(rawUrl);
      url.hash = '';
      for (const key of [...url.searchParams.keys()]) {
        if (/^(utm_.+|ref|source|campaign)$/i.test(key)) url.searchParams.delete(key);
      }
      url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
      url.pathname = url.pathname.replace(/\/+$/, '') || '/';
      return url.toString();
    } catch {
      return rawUrl;
    }
  }

  function normalizedTitle(title) {
    return title.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }

  function deduplicateItems(items) {
    const urls = new Set();
    const titles = new Set();
    return items.filter((item) => {
      if (!isValidItem(item)) return false;
      const url = canonicalUrl(item.url);
      const title = normalizedTitle(item.title);
      if (urls.has(url) || titles.has(title)) return false;
      urls.add(url);
      titles.add(title);
      return true;
    });
  }

  function filterItems(items, options = {}, userState = {}) {
    const query = String(options.query || '').trim().toLocaleLowerCase();
    const category = options.category || 'all';
    const date = options.date || 'all';
    const savedIds = userState.savedIds instanceof Set ? userState.savedIds : new Set();
    return items.filter((item) => {
      if (!isValidItem(item)) return false;
      if (category !== 'all' && item.category !== category) return false;
      if (date !== 'all' && item.date !== date) return false;
      if (options.savedOnly && !savedIds.has(item.id)) return false;
      if (query) {
        const content = [item.title, item.source, item.summary, item.category].join(' ').toLocaleLowerCase();
        if (!content.includes(query)) return false;
      }
      return true;
    });
  }

  function topFeatured(items, limit = 5) {
    return items
      .filter((item) => isValidItem(item) && item.featured)
      .map((item, index) => ({ item, index }))
      .sort((left, right) => {
        const rankDiff = (Number(right.item.rank) || 0) - (Number(left.item.rank) || 0);
        if (rankDiff) return rankDiff;
        const dateDiff = Date.parse(right.item.publishedAt || '') - Date.parse(left.item.publishedAt || '');
        return (Number.isNaN(dateDiff) ? 0 : dateDiff) || left.index - right.index;
      })
      .slice(0, limit)
      .map(({ item }) => item);
  }

  function getLatestDate(items) {
    const dates = items.filter(isValidItem).map((item) => item.date).sort();
    return dates.at(-1) || 'all';
  }

  function toggleSavedFilter(state = {}) {
    const savedOnly = !state.savedOnly;
    return { ...state, date: savedOnly ? 'all' : (state.date || 'all'), savedOnly };
  }

  function createStateStore(storage) {
    const key = 'ai-news-dashboard:v1:reading-state';
    let state = { readIds: new Set(), savedIds: new Set() };
    try {
      const stored = JSON.parse(storage?.getItem(key) || '{}');
      state = {
        readIds: new Set(Array.isArray(stored.readIds) ? stored.readIds.filter((id) => typeof id === 'string') : []),
        savedIds: new Set(Array.isArray(stored.savedIds) ? stored.savedIds.filter((id) => typeof id === 'string') : []),
      };
    } catch {
      // Keep an in-memory state if browser storage is unavailable or corrupt.
    }
    const persist = () => {
      try {
        storage?.setItem(key, JSON.stringify({
          readIds: [...state.readIds],
          savedIds: [...state.savedIds],
        }));
      } catch {
        // The controls remain usable for this page session if storage is blocked.
      }
    };
    const toggle = (collection, id) => {
      if (!id) return false;
      if (state[collection].has(id)) state[collection].delete(id);
      else state[collection].add(id);
      persist();
      return state[collection].has(id);
    };
    return {
      getState: () => ({ readIds: new Set(state.readIds), savedIds: new Set(state.savedIds) }),
      toggleRead: (id) => toggle('readIds', id),
      toggleSaved: (id) => toggle('savedIds', id),
    };
  }

  function createNode(doc, tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function categoryLabel(category) {
    return ({
      frontier_models: 'Frontier labs',
      startups_products: 'Startups & products',
      research_science: 'Research & science',
    })[category] || 'AI news';
  }

  function displayTime(item) {
    if (!item.publishedAt) return item.date;
    const date = new Date(item.publishedAt);
    if (Number.isNaN(date.getTime())) return item.date;
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
  }

  function makeCard(doc, item, featured, state = {}) {
    const article = createNode(doc, 'article', `news-card${featured ? ' featured-card' : ' feed-card'}${state.readIds?.has(item.id) ? ' is-read' : ''}`);
    article.dataset.itemId = item.id;

    const topLine = createNode(doc, 'div', 'card-topline');
    const tag = createNode(doc, 'span', 'category-tag', categoryLabel(item.category));
    tag.dataset.category = item.category;
    topLine.append(tag, createNode(doc, 'time', 'card-time', displayTime(item)));

    const title = createNode(doc, 'h3', 'card-title');
    const link = createNode(doc, 'a', '', item.title);
    link.href = canonicalUrl(item.url);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    title.append(link);

    const summary = createNode(doc, 'p', 'card-summary', item.summary);
    const copy = createNode(doc, 'div', featured ? 'card-copy' : 'feed-copy');
    copy.append(title, summary);

    const footer = createNode(doc, 'div', 'card-footer');
    footer.append(createNode(doc, 'span', 'source-name', item.source));

    const actions = createNode(doc, 'div', 'card-actions');
    const save = createNode(doc, 'button', 'card-action', state.savedIds?.has(item.id) ? '★ Saved' : '☆ Save');
    save.type = 'button';
    save.dataset.action = 'save';
    save.dataset.itemId = item.id;
    save.setAttribute('aria-pressed', String(Boolean(state.savedIds?.has(item.id))));
    const read = createNode(doc, 'button', 'card-action', state.readIds?.has(item.id) ? 'Read' : 'Mark read');
    read.type = 'button';
    read.dataset.action = 'read';
    read.dataset.itemId = item.id;
    read.setAttribute('aria-pressed', String(Boolean(state.readIds?.has(item.id))));
    actions.append(save, read);
    footer.append(actions);

    if (featured) article.append(topLine, copy, footer);
    else article.append(topLine, copy, footer);
    return article;
  }

  function renderDashboard(data, state = {}, doc = root.document) {
    if (!doc) return { featured: [], remaining: [] };
    const allItems = deduplicateItems(Array.isArray(data?.items) ? data.items : []);
    state = { ...state, date: state.date || getLatestDate(allItems) };
    const visibleItems = filterItems(allItems, state, state);
    const featured = topFeatured(visibleItems);
    const featuredIds = new Set(featured.map((item) => item.id));
    const remaining = visibleItems.filter((item) => !featuredIds.has(item.id));

    const featuredGrid = doc.getElementById('featuredGrid');
    const feedList = doc.getElementById('feedList');
    if (featuredGrid && feedList) {
      featuredGrid.replaceChildren(...featured.map((item) => makeCard(doc, item, true, state)));
      feedList.replaceChildren(...remaining.map((item) => makeCard(doc, item, false, state)));
    }
    const setText = (id, text) => {
      const node = doc.getElementById(id);
      if (node) node.textContent = text;
    };
    setText('featuredCount', `${featured.length} signal${featured.length === 1 ? '' : 's'}`);
    setText('feedCount', `${remaining.length} stor${remaining.length === 1 ? 'y' : 'ies'}`);
    setText('allCount', String(allItems.length));
    setText('frontierCount', String(allItems.filter((item) => item.category === 'frontier_models').length));
    setText('startupCount', String(allItems.filter((item) => item.category === 'startups_products').length));
    setText('researchCount', String(allItems.filter((item) => item.category === 'research_science').length));
    const datePicker = doc.getElementById('datePicker');
    if (datePicker) datePicker.value = state.date === 'all' ? '' : state.date;
    const dateLabel = doc.getElementById('selectedDateLabel');
    if (dateLabel) {
      const labelDate = state.date === 'all' ? getLatestDate(allItems) : state.date;
      dateLabel.textContent = labelDate === 'all'
        ? 'Latest briefing'
        : new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${labelDate}T00:00:00Z`));
    }
    const savedFilter = doc.getElementById('savedFilter');
    if (savedFilter) {
      savedFilter.setAttribute('aria-pressed', String(Boolean(state.savedOnly)));
      savedFilter.classList.toggle('is-active', Boolean(state.savedOnly));
    }
    for (const button of doc.querySelectorAll('[data-category]')) {
      if (button.matches('button[data-category]')) {
        button.classList.toggle('is-active', button.dataset.category === (state.category || 'all'));
      }
    }
    const empty = doc.getElementById('emptyState');
    if (empty) empty.hidden = visibleItems.length > 0;
    const generatedAt = data?.generatedAt ? new Date(data.generatedAt) : null;
    setText('updatedLabel', generatedAt && !Number.isNaN(generatedAt.getTime())
      ? `Updated ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(generatedAt)}`
      : 'Waiting for first update');
    const status = doc.getElementById('statusMessage');
    if (status) {
      const notes = Array.isArray(data?.sourceNotes) ? data.sourceNotes.filter((note) => typeof note === 'string' && note.trim()) : [];
      status.textContent = data?.status === 'partial' ? `Partial update · ${notes.join(' · ') || 'Some sources could not be checked.'}` : '';
      status.hidden = data?.status !== 'partial';
    }
    return { featured, remaining, allItems };
  }

  const api = { isValidItem, canonicalUrl, deduplicateItems, filterItems, topFeatured, getLatestDate, toggleSavedFilter, createStateStore, renderDashboard };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AINewsDashboard = api;

  if (root.document) {
    const start = () => {
      let storage;
      try { storage = root.localStorage; } catch { storage = undefined; }
      const store = createStateStore(storage);
      const data = root.AI_NEWS_DATA || {};
      const state = { query: '', category: 'all', date: getLatestDate(data.items || []), savedOnly: false };
      const render = () => renderDashboard(data, { ...state, ...store.getState() }, root.document);
      render();

      root.document.getElementById('searchInput')?.addEventListener('input', (event) => {
        state.query = event.currentTarget.value;
        render();
      });
      root.document.getElementById('datePicker')?.addEventListener('change', (event) => {
        state.date = event.currentTarget.value || 'all';
        render();
      });
      root.document.getElementById('allDatesButton')?.addEventListener('click', () => {
        state.date = 'all';
        render();
      });
      root.document.getElementById('savedFilter')?.addEventListener('click', () => {
        Object.assign(state, toggleSavedFilter(state));
        render();
      });
      root.document.querySelector('.sidebar')?.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-category]');
        if (!button) return;
        state.category = button.dataset.category;
        state.savedOnly = false;
        render();
      });
      root.document.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        if (button.dataset.action === 'save') store.toggleSaved(button.dataset.itemId);
        if (button.dataset.action === 'read') store.toggleRead(button.dataset.itemId);
        render();
      });
      root.document.addEventListener('keydown', (event) => {
        if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
        if (['INPUT', 'TEXTAREA'].includes(root.document.activeElement?.tagName)) return;
        event.preventDefault();
        root.document.getElementById('searchInput')?.focus();
      });
      const footer = root.document.getElementById('footerDate');
      if (footer) footer.textContent = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date());
    };
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
