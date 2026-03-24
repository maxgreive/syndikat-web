const DEFAULT_DEV_API_URL = "http://localhost:8080";
const DEFAULT_PROD_API_URL = "https://api.syndikat.golf";
const API_URL = `${resolveApiBaseUrl()}/tournaments`;
const endpoints = {
  official: API_URL,
  metrix: API_URL + "/metrix",
  route: API_URL + "/route"
};

const DEFAULT_VIEW = {
  center: [51, 9.5],
  zoom: 6
};

const routeMessages = {
  idle: "Wähle ein Turnier auf der Karte, um die Route zu planen.",
  loading: "Route wird berechnet...",
  INVALID_REQUEST: "Die Anfrage war unvollständig. Bitte prüfe deine Eingabe noch einmal.",
  INVALID_ADDRESS: "Startadresse nicht gefunden. Bitte gib eine vollständige Straßenadresse ein.",
  NO_ROUTE_FOUND: "Für diese Strecke konnte keine befahrbare Route gefunden werden.",
  UPSTREAM_QUOTA_EXCEEDED: "Die Routenberechnung ist gerade ausgelastet. Bitte versuche es später noch einmal.",
  UPSTREAM_ERROR: "Die Routenberechnung ist im Moment nicht verfügbar. Bitte versuche es später erneut.",
  default: "Die Route konnte nicht geladen werden. Bitte versuche es noch einmal."
};

const state = {
  map: null,
  selectedTournament: null,
  selectedMarker: null,
  routeLayer: null,
  routeMarkersLayer: null
};

const ui = {
  form: document.querySelector("[data-route-form]"),
  originInput: document.querySelector("[data-route-origin]"),
  submitButton: document.querySelector("[data-route-submit]"),
  feedback: document.querySelector("[data-route-feedback]"),
  message: document.querySelector("[data-route-message]"),
  summary: document.querySelector("[data-route-summary]"),
  selected: document.querySelector("[data-route-selected]"),
  distance: document.querySelector("[data-route-distance]"),
  duration: document.querySelector("[data-route-duration]"),
  originConfirmation: document.querySelector("[data-route-origin-confirmation]"),
  trainLink: document.querySelector("[data-route-train]")
};

initMap();

if (ui.form) {
  ui.form.addEventListener("submit", handleRouteSubmit);
}

if (ui.originInput) {
  ui.originInput.addEventListener("input", () => updateSubmitState());
}

function resolveApiBaseUrl() {
  if (typeof window !== "undefined") {
    const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    return isLocalhost ? DEFAULT_DEV_API_URL : DEFAULT_PROD_API_URL;
  }

  return DEFAULT_PROD_API_URL;
}

async function getTournaments(type) {
  try {
    const url = endpoints[type];
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function initMap() {
  const osmLayer = L.tileLayer("https://tile.openstreetmap.de/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.de/copyright">OpenStreetMap</a>'
  });

  const tournaments = await getTournaments("official");
  const metrix = await getTournaments("metrix");

  const markers = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 40
  });

  const metrixMarkers = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 40
  });

  metrix.forEach((tournament) => renderMarker(tournament, metrixMarkers));
  tournaments.forEach((tournament) => renderMarker(tournament, markers));

  state.map = L.map("tournaments-map", {
    layers: [osmLayer, markers]
  }).setView(DEFAULT_VIEW.center, DEFAULT_VIEW.zoom);

  if (state.map.messagebox) {
    state.map.messagebox.options.timeout = 99999;
    state.map.messagebox.show("Hinweis: Cookies akzeptieren, um Turniere zu laden.");
  }

  L.control.layers({
    "Discgolf.de": markers,
    Metrix: metrixMarkers
  }).addTo(state.map);

  L.control.resetView({
    position: "topleft",
    title: "Reset view",
    latlng: L.latLng(DEFAULT_VIEW.center),
    zoom: DEFAULT_VIEW.zoom
  }).addTo(state.map);
}

function renderMarker(tournament, layer) {
  if (!tournament?.coords?.lat || !tournament?.coords?.lng) return;

  const iconElement = document.querySelector("[data-icon]").content.firstElementChild.cloneNode(true);
  iconElement.style.fill = `hsl(220deg 50% ${Math.floor(Math.random() * (70 - 50 + 1) + 50)}%)`;
  const sizeMultiplier = Math.random() * 0.3 + 1;
  const icon = L.divIcon({
    html: iconElement,
    iconSize: [16 * sizeMultiplier, 25 * sizeMultiplier],
    className: "icon"
  });

  const marker = L.marker([tournament.coords.lat, tournament.coords.lng], { icon });
  marker.on("click", () => selectTournament(tournament, marker));

  const popup = createPopupContent(tournament, marker);
  marker.bindPopup(popup, { maxWidth: 280 });

  layer.addLayer(marker);
}

function createPopupContent(tournament, marker) {
  const wrapper = document.createElement("div");
  const isOneDay = tournament?.dates?.endTournament && tournament?.dates?.startTournament === tournament?.dates?.endTournament;
  const badgeHTML = tournament.badge ? `<span class="popup-badge">${escapeHtml(tournament.badge)}</span>` : "";
  const details = [
    `<p class="popup-title">${badgeHTML}${escapeHtml(tournament.title || "")}</p>`,
    `<p>Ort: ${escapeHtml(tournament.location || "Unbekannt")}</p>`,
    `<p>${!isOneDay ? "Erster " : ""}Spieltag: ${tournament?.dates?.startTournament ? formatDate(tournament.dates.startTournament) : "noch unbekannt"}</p>`
  ];

  if (tournament?.dates?.endTournament && !isOneDay) {
    details.push(`<p>Letzter Spieltag: ${formatDate(tournament.dates.endTournament)}</p>`);
  }

  if (tournament?.dates?.startRegistration) {
    details.push(`<p>Registrierung: ab ${formatDate(tournament.dates.startRegistration)}</p>`);
  }

  if (tournament?.dates?.startRegistration && tournament?.spots?.overall) {
    details.push(`<p>Freie Startplätze: ${tournament.spots.overall - tournament.spots.used}/${tournament.spots.overall}</p>`);
  }

  if (tournament.relatedTournaments?.length) {
    details.push(`<p>Verbundene Runden: ${tournament.relatedTournaments.map((item) => `<a href="https://discgolfmetrix.com/${item.id}">${escapeHtml(item.round)}</a>`).join(", ")}</p>`);
  }

  details.push(`<p><a href="${escapeAttribute(tournament.link || "#")}" target="_blank" rel="noopener" class="popup-link">Turnierausschreibung ansehen <i class="ion ion-md-exit"></i></a></p>`);
  wrapper.innerHTML = details.join("");

  const routeButton = document.createElement("button");
  routeButton.type = "button";
  routeButton.className = "button popup-route-button";
  routeButton.textContent = "Dieses Turnier auswählen";
  routeButton.addEventListener("click", () => {
    selectTournament(tournament, marker);
    marker.closePopup();
    ui.originInput?.focus();
  });
  wrapper.append(routeButton);

  return wrapper;
}

function selectTournament(tournament, marker) {
  const selectionChanged = state.selectedTournament !== tournament;

  state.selectedTournament = tournament;
  state.selectedMarker = marker;

  if (selectionChanged) {
    clearRouteSummary();
    clearRouteLayers();
  }

  updateSelectionMessage();
  updateSubmitState();
}

function updateSelectionMessage() {
  if (!ui.message || !state.selectedTournament) return;

  const location = state.selectedTournament.location ? ` in ${state.selectedTournament.location}` : "";
  setFeedbackMessage(`Ziel ausgewählt: ${state.selectedTournament.title}${location}.`);
}

function updateSubmitState(isLoading = false) {
  if (!ui.submitButton || !ui.originInput) return;

  const hasOrigin = ui.originInput.value.trim().length > 0;
  const canSubmit = Boolean(state.selectedTournament && hasOrigin && !isLoading);

  ui.submitButton.disabled = !canSubmit;
  ui.submitButton.textContent = isLoading ? "Route wird geladen..." : "Route berechnen";
}

async function handleRouteSubmit(event) {
  event.preventDefault();

  if (!state.selectedTournament || !ui.originInput) {
    setFeedbackMessage(routeMessages.idle, true);
    clearRouteSummary();
    clearRouteLayers();
    updateSubmitState();
    return;
  }

  const origin = ui.originInput.value.trim();
  if (!origin) {
    setFeedbackMessage("Bitte gib eine Startadresse ein.", true);
    clearRouteSummary();
    clearRouteLayers();
    updateSubmitState();
    return;
  }

  updateSubmitState(true);
  setFeedbackMessage(routeMessages.loading);
  clearRouteSummary();
  clearRouteLayers();

  try {
    const response = await fetch(endpoints.route, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        origin,
        destination: buildDestinationPayload(state.selectedTournament)
      })
    });

    const payload = await parseJsonResponse(response);

    if (!response.ok) {
      handleRouteError(payload);
      return;
    }

    renderRoute(payload);
  } catch (error) {
    console.error(error);
    handleRouteError();
  } finally {
    updateSubmitState(false);
  }
}

function buildDestinationPayload(tournament) {
  return {
    lat: Number(tournament.coords.lat),
    lng: Number(tournament.coords.lng),
    address: tournament.address || tournament.location || tournament.title,
    name: tournament.title,
    station: tournament.station || tournament.location || tournament.title
  };
}

async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
}

function handleRouteError(payload = {}) {
  clearRouteLayers();
  clearRouteSummary();

  const code = payload?.error?.code || payload?.code;
  const message = routeMessages[code] || routeMessages.default;
  setFeedbackMessage(message, true);
}

function renderRoute(payload) {
  const coordinates = payload?.route?.geometry?.coordinates;

  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    handleRouteError();
    return;
  }

  clearRouteLayers();

  const latLngs = coordinates
    .filter((pair) => Array.isArray(pair) && pair.length >= 2)
    .map(([lng, lat]) => [lat, lng]);

  state.routeLayer = L.polyline(latLngs, {
    color: "#2563eb",
    weight: 5,
    opacity: 0.85
  }).addTo(state.map);

  const resolvedOrigin = payload?.resolvedPoints?.origin;
  const resolvedDestination = payload?.resolvedPoints?.destination;
  const routeMarkers = [];

  if (resolvedOrigin?.lat && resolvedOrigin?.lng) {
    routeMarkers.push(L.circleMarker([resolvedOrigin.lat, resolvedOrigin.lng], {
      radius: 7,
      weight: 2,
      color: "#0f172a",
      fillColor: "#f8fafc",
      fillOpacity: 1
    }).bindTooltip("Start", { direction: "top" }));
  }

  if (resolvedDestination?.lat && resolvedDestination?.lng) {
    routeMarkers.push(L.circleMarker([resolvedDestination.lat, resolvedDestination.lng], {
      radius: 7,
      weight: 2,
      color: "#0f172a",
      fillColor: "#fde68a",
      fillOpacity: 1
    }).bindTooltip("Ziel", { direction: "top" }));
  }

  if (routeMarkers.length) {
    state.routeMarkersLayer = L.featureGroup(routeMarkers).addTo(state.map);
  }

  const boundsGroup = L.featureGroup([state.routeLayer]);
  if (state.selectedMarker) {
    boundsGroup.addLayer(state.selectedMarker);
  }

  state.map.fitBounds(boundsGroup.getBounds(), {
    padding: [40, 40]
  });

  renderRouteSummary(payload);
  setFeedbackMessage(`Route zu ${state.selectedTournament.title} geladen.`);
}

function renderRouteSummary(payload) {
  if (!ui.summary || !ui.selected || !ui.distance || !ui.duration || !ui.originConfirmation || !ui.trainLink) return;

  ui.summary.hidden = false;
  ui.selected.textContent = state.selectedTournament?.title || "";
  ui.distance.textContent = formatDistance(payload?.route?.distanceMeters);
  ui.duration.textContent = formatDuration(payload?.route?.durationSeconds);

  const normalizedOrigin = payload?.resolvedPoints?.origin?.text;
  ui.originConfirmation.textContent = normalizedOrigin ? `Startadresse bestätigt als: ${normalizedOrigin}` : "";

  const trainUrl = payload?.train?.url;
  if (trainUrl) {
    ui.trainLink.href = trainUrl;
    ui.trainLink.hidden = false;
  } else {
    ui.trainLink.hidden = true;
    ui.trainLink.removeAttribute("href");
  }
}

function clearRouteSummary() {
  if (!ui.summary || !ui.selected || !ui.distance || !ui.duration || !ui.originConfirmation || !ui.trainLink) return;

  ui.summary.hidden = true;
  ui.selected.textContent = "";
  ui.distance.textContent = "";
  ui.duration.textContent = "";
  ui.originConfirmation.textContent = "";
  ui.trainLink.hidden = true;
  ui.trainLink.removeAttribute("href");
}

function clearRouteLayers() {
  if (!state.map) return;

  if (state.routeLayer) {
    state.map.removeLayer(state.routeLayer);
    state.routeLayer = null;
  }

  if (state.routeMarkersLayer) {
    state.map.removeLayer(state.routeMarkersLayer);
    state.routeMarkersLayer = null;
  }
}

function setFeedbackMessage(message, isError = false) {
  if (!ui.message || !ui.feedback) return;

  ui.message.textContent = message;
  ui.feedback.dataset.state = isError ? "error" : "default";
}

function formatDistance(distanceMeters) {
  if (typeof distanceMeters !== "number" || Number.isNaN(distanceMeters)) return "";
  return `${new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: distanceMeters >= 100000 ? 0 : 1
  }).format(distanceMeters / 1000)} km`;
}

function formatDuration(durationSeconds) {
  if (typeof durationSeconds !== "number" || Number.isNaN(durationSeconds)) return "";

  const totalMinutes = Math.round(durationSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) return `${minutes} Min.`;
  if (!minutes) return `${hours} Std.`;
  return `${hours} Std. ${minutes} Min.`;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
