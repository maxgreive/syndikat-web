const API_URL = "https://discgolf-tournaments-api-45d839f9ba85.herokuapp.com/";
const endpoints = {
  official: API_URL,
  metrix: API_URL + 'metrix'
}

window.addEventListener('CookiebotOnConsentReady', () => {
  const consentGiven = window.CookieConsent && window.CookieConsent.consent && window.CookieConsent.consent.marketing;
  if (consentGiven) initMap();

  return handleConsent(consentGiven);
});

document.addEventListener('DOMContentLoaded', () => {
  const consentGiven = window.CookieConsent && window.CookieConsent.consent && window.CookieConsent.consent.marketing;
  return handleConsent(consentGiven);
});

function handleConsent(consent) {
  if (document.querySelector('.map-no-consent')) document.querySelector('.map-no-consent').remove();
  if (!consent) {
    document.querySelector('#tournaments-map').insertAdjacentHTML('afterbegin', `
      <span class="map-no-consent">Um die Karte zu sehen, muss <a href="#" onclick="handleOpenConsent();">im Cookie-Tool den Marketing-Services zugestimmt werden</a> und gegebenenfalls der AdBlocker deaktiviert werden..</span>
    `);
  }
}

function handleOpenConsent() {
  if (!window.CookieConsent) return;
  return window.CookieConsent.show();
}

async function getTournaments(type) {
  const url = endpoints[type];
  const cachedData = Cookies.get(`tournament-data-${type}`);

  if (!cachedData) {
    const response = await fetch(url);
    const tournaments = await response.json();
    Cookies.set(`tournament-data-${type}`, JSON.stringify(tournaments), {expires: 1});
    return tournaments;
  }

  return JSON.parse(cachedData);
}

async function initMap() {
  const osmLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  });

  const tournaments = await getTournaments('official');
  const metrix = await getTournaments('metrix');

  const markers = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 40
  });

  const metrixMarkers = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 40
  });

  metrix.forEach(tournament => renderMarker(tournament, metrixMarkers));
  tournaments.forEach((tournament) => renderMarker(tournament, markers));

  const map = L.map("tournaments-map", {
    layers: [osmLayer, markers]
  }).setView([51, 9.5], 6);

  const overlayMaps = {
    'Discgolf.de': markers,
    'Metrix': metrixMarkers
  }

  L.control.layers(null, overlayMaps).addTo(map);

  L.control.resetView({
    position: "topleft",
    title: "Reset view",
    latlng: L.latLng([51, 9.5]),
    zoom: 6,
  }).addTo(map);
}

function renderMarker(tournament, layer) {
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
  layer.addLayer(marker);
  const isOneDay = tournament?.dates?.endTournament && tournament?.dates?.startTournament === tournament?.dates?.endTournament;

  marker.bindPopup(`
      <p class="popup-title">${tournament.title}</p>
      Ort: ${tournament.location}
      <p>${!isOneDay ? 'Erster ' : ''}Spieltag: ${tournament.dates.startTournament ? formatDate(tournament.dates.startTournament) : "noch unbekannt"}</p>
      ${tournament.dates.endTournament && !isOneDay ? `<p>Letzter Spieltag: ${formatDate(tournament.dates.endTournament)}</p>` : ""}
      ${tournament.dates.startRegistration ? `<p>Registrierung: ab ${formatDate(tournament.dates.startRegistration)}</p>` : ""}
      ${tournament.relatedTournaments ? `<p>Verbundene Runden: ${tournament.relatedTournaments.map(t => `<a href="https://discgolfmetrix.com/${t.id}">${t.round}</a>`).join(', ')}</p>` : ''}
      <p><a href="${tournament.link}" target="_blank" rel="noopener" class="popup-link">Turnierausschreibung ansehen</a></p>
    `, {
    maxWidth: 250
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