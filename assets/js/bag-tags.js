const DEFAULT_DEV_API_URL = 'http://localhost:8080';
const DEFAULT_PROD_API_URL = 'https://api.syndikat.golf';
const API_URL = resolveApiBaseUrl();

async function initBagTags() {
  const $el = document.querySelector('.bag-tags-wrapper');
  if (!$el) return;

  try {
    const ranking = await fetch(`${API_URL}/bagtag`).then(response => response.json());
    renderRanking(ranking, $el);
  } catch (err) {
    console.error(err);
  }
}

function resolveApiBaseUrl() {
  if (typeof window !== 'undefined') {
    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    return isLocalhost ? DEFAULT_DEV_API_URL : DEFAULT_PROD_API_URL;
  }

  return DEFAULT_PROD_API_URL;
}

function renderRanking(ranking, $el) {
  const html = ranking.map(entry => `
    <tr>
      <td>${entry.Rank}</td>
      <td>${entry.Name}</td>
    </tr>
  `).join('');
  const tableBody = $el.querySelector('tbody');
  if (!tableBody) return;
  tableBody.innerHTML = '';

  return tableBody.insertAdjacentHTML('beforeend', html);
}

initBagTags();
