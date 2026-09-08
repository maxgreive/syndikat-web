(() => {
  const input = document.getElementById('js-search-input');
  const results = document.getElementById('js-results-container');
  if (!input || !results) return;

  const normalize = value => String(value ?? '')
    .toLocaleLowerCase('de-DE')
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  let indexPromise;
  const loadIndex = () => {
    indexPromise ??= fetch('/search.json')
      .then(response => {
        if (!response.ok) throw new Error(`Search index request failed: ${response.status}`);
        return response.json();
      });
    return indexPromise;
  };

  const matches = (entry, terms) => {
    const searchable = normalize([entry.title, entry.tags, entry.content].join(' '));
    return terms.every(term => searchable.includes(term));
  };

  function render(query, index) {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    if (!terms.length) {
      results.replaceChildren();
      return;
    }

    const matchingEntries = index.filter(entry => matches(entry, terms)).slice(0, 10);
    results.innerHTML = matchingEntries.length
      ? matchingEntries.map(entry => entry.article).join('')
      : '<h3 class="no-results">No results found</h3>';
  }

  let searchRequest = 0;
  input.addEventListener('input', () => {
    const query = input.value;
    const request = ++searchRequest;
    loadIndex()
      .then(index => { if (request === searchRequest) render(query, index); })
      .catch(() => {
        if (request === searchRequest) results.innerHTML = '<h3 class="no-results">No results found</h3>';
      });
  });

  document.querySelector('.icon__search')?.addEventListener('click', loadIndex, { once: true });
  input.addEventListener('focus', loadIndex, { once: true });
})();
