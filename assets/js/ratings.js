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
              <a href="${entry.link}" target="_blank">${entry.firstName} ${entry.lastName}</a>
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
    const ratings = await fetch('http://localhost:8080/ratings').then(response => response.json());
    await getDivisions(ratings);
    await renderRatings(ratings, $el);
    setupListeners($el.querySelectorAll('tr'));
  } catch (err) {
    console.error(err);
  }
}

function getAutoComplete(input, data) {
  const query = input.value.split(/\s+/).pop().toLowerCase();
  if (query.length < 1) return Promise.resolve(null);
  return new Promise((resolve) => {
    let match = null;
    for (const item of data) {
      const nameWords = item.name.toLowerCase().split(/\s+/);
      const clubWords = item.club.toLowerCase().split(/\s+/);
      const foundWord = nameWords.find(word => word.startsWith(query)) || clubWords.find(word => word.startsWith(query));
      if (foundWord) {
        match = foundWord;
        break;
      }
    }
    resolve(match);
  });
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
        if (selectedClub === 'syndikat-only' && !isSyndikat || selectedClub === 'cologne-only' && !isCologne) {
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
  searchInput.addEventListener('input', async (event) => {
    const query = event.target.value.toLowerCase();

    if (query.length < 3) {
      $rows.forEach(($row, i) => {
        $row.hidden = false;
        $row.querySelector('td').textContent = i + 1;
      });
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

    const autoComplete = await getAutoComplete(event.target, Array.from($rows).filter($row => $row.hidden === false).map($row => {
      return {
        name: $row.querySelector('.ranking-name-wrapper a').textContent,
        club: $row.dataset.club
      }
    }));

    const ghost = searchInput.parentElement.querySelector('.search__ghost');
    ghost.innerHTML = query + `<span>${autoComplete ? autoComplete.slice(query.split(/\s+/).pop().length) : ''}</span>`;
  });

  searchInput.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      event.preventDefault();
      const existingGhost = event.target.parentElement.querySelector('.search__ghost');
      if (existingGhost) {
        const currentText = existingGhost.textContent;
        existingGhost.querySelector('span').textContent = '';
        existingGhost.textContent = currentText;
        searchInput.value = currentText;
      }
    }
  });

  searchInput.addEventListener('blur', event => {
    setTimeout(() => {
      const existingGhost = event.target.parentElement.querySelector('.search__ghost');
      if (existingGhost) {
        existingGhost.querySelector('span').textContent = '';
      }
    }, 100);
  });
}

initRatings();
