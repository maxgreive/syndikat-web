window.addEventListener('CookiebotOnConsentReady', () => {
  if (window.CookieConsent.consent.marketing) return getTournaments(items => initMap(items));

  return handleNoConsent();
});

function handleNoConsent() {
  document.querySelector('#tournaments-map').insertAdjacentHTML('afterbegin', `
    <span class="map-no-consent">Um die Karte zu sehen, muss <a onclick="window.CookieConsent.show();">im Cookie-Tool den Marketing-Services zugestimmt werden</a>.</span>
  `);
}

async function getTournaments(cb) {
  const cachedData = window.sessionStorage.getItem('tournament-data');

  if (!cachedData) {
    const response = await fetch("http://localhost:8080");
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

  L.control.resetView({
    position: "topleft",
    title: "Reset view",
    latlng: L.latLng([51, 9.5]),
    zoom: 6,
  }).addTo(map);

  const markers = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 40
  });

  tournaments.forEach((tournament) => {
    if (!tournament.coords.lat) return;
    const iconElement = document.querySelector("[data-icon]").content.firstElementChild.cloneNode(true);
    iconElement.style.fill = `hsl(220deg 50% ${Math.floor(Math.random() * (70 - 50 + 1) + 50)}%)`;
    const sizeMultiplier = Math.random() * 0.3 + 1;
    const icon = L.divIcon({
      html: iconElement,
      iconSize: [16 * sizeMultiplier, 25 * sizeMultiplier],
      className: "icon"
    });

    const marker = L.marker([tournament.coords.lat, tournament.coords.lng], { icon: icon });
    markers.addLayer(marker);
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

  markers.addTo(map);
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