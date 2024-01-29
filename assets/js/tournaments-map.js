getTournaments((a) => initMap(a));

async function getTournaments(cb) {
  // const response = await fetch("https://discgolf-tournaments-api-45d839f9ba85.herokuapp.com/");
  const cachedData = window.sessionStorage.getItem('tournament-data');

  if (!cachedData) {
    const response = await fetch("http://localhost:8080/");
    const tournaments = await response.json();
    window.sessionStorage.setItem('tournament-data', JSON.stringify(tournaments));
    return cb(tournaments);
  }

  return cb(JSON.parse(cachedData));
}

function initMap(tournaments) {
  const map = L.map("tournaments-map").setView([51, 9.5], 6);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  tournaments.forEach((tournament) => {
    if (!tournament.coords.lat) return;
    const iconElement = document.querySelector("[data-icon]").content.firstElementChild.cloneNode(true);
    iconElement.style.fill = `rgb(30, 144, ${Math.random() * (196 - 255 + 1) + 196})`;
    const sizeMultiplier = Math.random() * 0.3 + 1;
    const icon = L.divIcon({
      html: iconElement,
      iconSize: [16 * sizeMultiplier, 25 * sizeMultiplier],
      className: "icon"
    });
    const marker = L.marker([tournament.coords.lat, tournament.coords.lng], { icon: icon }).addTo(map);
    const isOneDay = tournament?.dates?.startTournament === tournament?.dates?.endTournament;

    marker.bindPopup(`
      <p class="popup-title">${tournament.title}</p>
      Ort: ${tournament.location}<br />
      ${!isOneDay ? 'Erster ' : ''}Spieltag: ${tournament.dates.startTournament ? formatDate(tournament.dates.startTournament) : "noch unbekannt"}<br />
      ${tournament.dates.endTournament && !isOneDay ? "Letzter Spieltag: " + formatDate(tournament.dates.endTournament) + "<br />" : ""}
      Registrierung: ${tournament.dates.startRegistration ? 'ab ' + formatDate(tournament.dates.startRegistration) : "unbekannt"}<br />
      <a href="${tournament.link}">Turnier auf discgolf.de</a>
    `, {
      maxWidth: 250
    });
  });
}

function formatDate(date) {
  const dateOptions = {
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  };

  return new Date(date).toLocaleDateString("de-DE", dateOptions);
}