function renderRatings(ratings, $el) {
  const html = ratings.map(entry => `
    <tr data-club="${entry.club}"${entry.club.includes('Syndikat') ? '' : ' hidden'}>
      <td>${entry.rank}</td>
      <td>
        <div class="name-cell">
          ${entry.image ? `
            <img src="${entry.image}" alt="${entry.firstName} ${entry.lastName}" class="avatar">
          ` : `
            <span class="avatar" style="background-color: hsl(${Math.random()}turn, 70%, 50%);"><span>${entry.firstName[0]}${entry.lastName[0]}</span></span>
          `}
          <div class="ranking-name-wrapper">
            <a href="${entry.link}">${entry.firstName} ${entry.lastName}</a>
            <div class="ranking-club">${entry.club}</div>
          </div>
        </div>
      </td>
      <td>${entry.rating} ${entry.ratingChange > 0 ? '<i class="ion ion-ios-trending-up color--green"></i>' : entry.ratingChange < 0 ? '<i class="ion ion-ios-trending-down color--red"></i>' : ''}</td>
      <td><span class="pill" data-division="${entry.division}">${entry.division}</span></td>
      <td>${entry.divisionRank}</td>
      <td>${entry.dmRounds}/${entry.roundCount}</td>
      <td>${formatDate(entry.lastRound, false)}</td>
    </tr>
  `).join('');
  $el.innerHTML = html;
}

async function initRatings() {
  const $el = document.querySelector('#ratings tbody');
  if (!$el) return;

  try {
      const ratings = await fetch('https://api.syndikat.golf/ratings').then(response => response.json());
      renderRatings(ratings, $el);
  } catch (err) {
    console.error(err);
  }
}

initRatings();

document.querySelector('[data-toggle-club]').addEventListener('click', event => {
  const $rows = document.querySelectorAll('#ratings tbody tr');
  event.target.textContent = event.target.textContent === 'Alle zeigen' ? 'Syndikat zeigen' : 'Alle zeigen';
  $rows.forEach($row => {
    if (!$row.dataset.club.includes('Syndikat')) {
      $row.hidden = !event.target.textContent.includes('Syndikat');
    }
  });
});
