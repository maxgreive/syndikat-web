async function initBagTags() {
  const $el = document.querySelector('.bag-tags-wrapper');
  if (!$el) return;

  try {
    const ranking = await fetch('https://api.syndikat.golf/bagtag').then(response => response.json());
    renderRanking(ranking, $el);
  } catch (err) {
    console.error(err);
  }
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