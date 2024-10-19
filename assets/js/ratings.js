function renderRatings(ratings, $el) {
  let index = 0;
  $el.innerHTML = ratings.map(entry => {
    const isSyndikat = entry.club.includes('Syndikat');
    index = index + (isSyndikat ? 1 : 0);
    return `
      <tr data-club="${entry.club}"${isSyndikat ? '' : ' hidden'}>
        <td>${index}</td>
        <td>
          <div class="name-cell">
            ${entry.image ? `
              <img src="${entry.image}" alt="${entry.firstName} ${entry.lastName}" class="avatar">
            ` : `
              <span class="avatar" style="background-color: hsl(${Math.random().toFixed(3)}turn, 70%, 50%);"><span>${entry.firstName[0]}${entry.lastName[0]}</span></span>
            `}
            <div class="ranking-name-wrapper">
              <a href="${entry.link}">${entry.firstName} ${entry.lastName}</a>
              <div class="ranking-club">${entry.club}</div>
            </div>
          </div>
        </td>
        <td>${entry.rating} ${entry.ratingChange > 0 ? '<i class="ion ion-ios-trending-up color--green"></i>' : entry.ratingChange < 0 ? '<i class="ion ion-ios-trending-down color--red"></i>' : ''}</td>
        <td><span class="pill" data-division="${entry.division}">${entry.division}</span></td>
        <td>${entry.divisionRank}<span class="percentile">Top ${Math.ceil(entry.divisionRank / entry.divisionCount * 100)}%</span></td>
        <td>${entry.dmRounds}/${entry.roundCount}</td>
        <td>${formatDate(entry.lastRound, false)}</td>
      </tr>
    `
  }).join('');
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

document.querySelector('[data-toggle-club]').addEventListener('change', event => {
  const $rows = document.querySelectorAll('#ratings tbody tr');
  let clubs = [];
  let index = 1;

  switch (event.target.value) {
    case 'cologne-only':
      clubs = [
        'Syndikat',
        'Köln'
      ]
      break;
    case 'syndikat-only':
      clubs = ['Syndikat']
      break;
    default:
      break;
  }
  $rows.forEach(($row, i) => {
    const club = $row.dataset.club;
    if (clubs.length) {
      const hasClub = clubs.some(c => club.includes(c));
      $row.hidden = !hasClub;
      if (hasClub) {
        $row.querySelector('td').textContent = index;
        index++;
      }
    } else {
      $row.hidden = false;
      $row.querySelector('td').textContent = i + 1;
    }
  });
});
