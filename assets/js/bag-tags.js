(async () => {
  const $el = document.querySelector('.bag-tags-wrapper');
  if (!$el) return;
  try {
    const consentGiven = window.CookieConsent && window.CookieConsent.consent && window.CookieConsent.consent.marketing;

    if (!consentGiven) {
      renderRanking(null, $el);
      throw 'No Consent given';
    }
    const ranking = await fetch('https://sheetdb.io/api/v1/ausoximblc9rv').then(response => response.json());
    renderRanking(ranking, $el);
  } catch (err) {
    console.error(err);
  }
})();


function renderRanking(ranking, $el) {
  if (!ranking) {
    return $el.insertAdjacentHTML('beforeend', `
        <blockquote>
          <p>Error: Um das Leaderboard zu sehen, müssen Cookies akzeptiert werden.</p>
        </blockquote>
      `);
  };

  const html = ranking.map(entry => `
      <tr>
        <td>${entry.Rank}</td>
        <td>${entry.Name}</td>
      </tr>
    `).join('');
  return $el.querySelector('tbody').insertAdjacentHTML('beforeend', html);
}