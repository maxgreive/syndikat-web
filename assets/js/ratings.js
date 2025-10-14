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
              <span class="avatar" style="background-color: hsl(${Math.random().toFixed(3)}turn, 95%, 20%);"><span>${entry.firstName[0]}${entry.lastName[0]}</span></span>
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

async function getDivisions(ratings) {
  const $select = document.querySelector('[data-toggle-division]');
  const divisions = Array.from(new Set(ratings.map(r => r.division))).sort((a, b) => a.localeCompare(b, 'de', { numeric: true }));
  $select.innerHTML += divisions.map(division => `
    <option value="${division}">${division}</option>
  `).join('');
}

async function initRatings() {
  const $el = document.querySelector('#ratings tbody');
  if (!$el) return;

  try {
    const ratings = await fetch('https://api.syndikat.golf/ratings').then(response => response.json());
    await getDivisions(ratings);
    await renderRatings(ratings, $el);
    setupListeners($el.querySelectorAll('tr'));
  } catch (err) {
    console.error(err);
  }
}

function setupListeners($rows) {
  const clubSelect = document.querySelector('[data-toggle-club]');
  const divisionSelect = document.querySelector('[data-toggle-division]');
  const searchInput = document.querySelector('[data-rating-search]');

  if (!clubSelect || !divisionSelect) return;

  divisionSelect.disabled = false;
  divisionSelect.addEventListener('change', event => {
    searchInput.value = '';
    const selectedClub = clubSelect.value;
    let index = 1;

    $rows.forEach(($row, i) => {
      const division = $row.querySelector('span[data-division]').textContent;
      if (event.target.value === 'all' || division === event.target.value) {
        const isSyndikat = $row.dataset.club.includes('Syndikat');
        const isCologne = ['Köln', 'Syndikat'].some(c => $row.dataset.club.includes(c));
        if (selectedClub === 'syndikat-only' && !isSyndikat) {
          $row.hidden = true;
        } else if (selectedClub === 'cologne-only' && !isCologne) {
          $row.hidden = true;
        } else {
          $row.hidden = false;
          $row.querySelector('td').textContent = index;
          index++;
        }
      } else {
        $row.hidden = true;
      }
    });
  });

  clubSelect.disabled = false;
  clubSelect.addEventListener('change', event => {
    searchInput.value = '';
    const selectedDivision = divisionSelect.value;
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
      const division = $row.querySelector('span[data-division]').textContent;
      const isInClub = clubs.some(c => $row.dataset.club.includes(c));
      if (clubs.length === 0 || isInClub) {
        if (selectedDivision === 'all' || division === selectedDivision) {
          $row.hidden = false;
          $row.querySelector('td').textContent = index;
          index++;
        } else {
          $row.hidden = true;
        }
      } else {
        $row.hidden = true;
      }
    });
  });

  if (!searchInput) return;

  searchInput.disabled = false;
  searchInput.addEventListener('input', event => {
    const query = event.target.value.toLowerCase();
    if (query.length < 3) {
      $rows.forEach(($row, i) => {
        $row.hidden = false;
        $row.querySelector('td').textContent = i + 1;
      });

      return;
    }

    let index = 1;
    clubSelect.value = 'all';
    divisionSelect.value = 'all';
    $rows.forEach($row => {
      const name = $row.querySelector('.ranking-name-wrapper a').textContent.toLowerCase();
      const club = $row.dataset.club.toLowerCase();
      if (name.includes(query) || club.includes(query)) {
        $row.hidden = false;
        $row.querySelector('td').textContent = index;
        index++;
      } else {
        $row.hidden = true;
      }
    });
  });
}

initRatings();
