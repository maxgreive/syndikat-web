const API_URL = "http://127.0.0.1:8080/tournaments";
const endpoints = {
  official: API_URL,
  metrix: API_URL + '/metrix'
}

let map = null;
initMap();

async function getTournaments(type) {
  try {
    const url = endpoints[type];
    const response = await fetch(url);
    const tournaments = await response.json();
    return tournaments;
  } catch (error) {
    console.error(error);
  }
}

async function initMap() {
  const osmLayer = L.tileLayer("https://tile.openstreetmap.de/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.de/copyright">OpenStreetMap</a>'
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
  tournaments.forEach(tournament => renderMarker(tournament, markers));

  map = L.map("tournaments-map", {
    layers: [osmLayer, markers]
  }).setView([51, 9.5], 6);

  if (map.messagebox) {
    map.messagebox.options.timeout = 99999;
    map.messagebox.show('Hinweis: Cookies akzeptieren, um Turniere zu laden.');
  }

  const overlayMaps = {
    'Discgolf.de': markers,
    'Metrix': metrixMarkers
  }

  L.control.layers(overlayMaps).addTo(map);

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
  const badgeHTML = tournament.badge ? `<span class="popup-badge">${tournament.badge}</span>` : "";

  marker.bindPopup(`
      <p class="popup-title">${badgeHTML}${tournament.title}</p>
      <p>Ort: ${tournament.location}</p>
      <p>${!isOneDay ? 'Erster ' : ''}Spieltag: ${tournament.dates.startTournament ? formatDate(tournament.dates.startTournament) : "noch unbekannt"}</p>
      ${tournament.dates.endTournament && !isOneDay ? `<p>Letzter Spieltag: ${formatDate(tournament.dates.endTournament)}</p>` : ""}
      ${tournament.dates.startRegistration ? `<p>Registrierung: ab ${formatDate(tournament.dates.startRegistration)}</p>` : ""}
      ${tournament.dates.startRegistration && tournament?.spots?.overall ? `<p>Freie Startplätze: ${tournament.spots.overall - tournament.spots.used}/${tournament.spots.overall}</p>` : ''}
      ${tournament.relatedTournaments ? `<p>Verbundene Runden: ${tournament.relatedTournaments.map(t => `<a href="https://discgolfmetrix.com/${t.id}">${t.round}</a>`).join(', ')}</p>` : ''}
      <p><a href="${tournament.link}" target="_blank" rel="noopener" class="popup-link">Turnierausschreibung ansehen <i class="ion ion-md-exit"></i></a></p>
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