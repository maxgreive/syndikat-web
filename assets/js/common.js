const DEFAULT_DEV_API_URL = "http://localhost:8080";
const DEFAULT_PROD_API_URL = "https://api.syndikat.golf";

function resolveApiBaseUrl() {
  if (typeof window !== "undefined") {
    const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    return isLocalhost ? DEFAULT_DEV_API_URL : DEFAULT_PROD_API_URL;
  }

  return DEFAULT_PROD_API_URL;
}

document.addEventListener("DOMContentLoaded", function () {
  'use strict';

  var html = document.querySelector('html'),
    menuOpenIcon = document.querySelector(".icon__menu"),
    menuCloseIcon = document.querySelector(".nav__icon-close"),
    menuList = document.querySelector(".main-nav"),
    menuPanel = document.querySelector(".main-nav__box"),
    searchOpenIcon = document.querySelector(".icon__search"),
    searchCloseIcon = document.querySelector("[data-search-close]"),
    searchInput = document.querySelector(".search__text"),
    search = document.querySelector(".search"),
    searchBox = document.querySelector(".search__box"),
    socialLinks = document.querySelectorAll(".social__link[data-social-name]"),
    toggleTheme = document.querySelector(".toggle-theme"),
    btnScrollToTop = document.querySelector(".top"),
    menuItems = document.querySelectorAll(".main-nav .nav__link[href^='\/#']");


  /* =======================================================
  // Menu + Search + Theme Switcher
  ======================================================= */
  menuOpenIcon.addEventListener("click", () => {
    menuOpen();
  });

  menuCloseIcon.addEventListener("click", () => {
    menuClose();
  });

  menuItems.forEach(item => item.addEventListener('click', () => menuClose()));

  function menuOpen() {
    menuList.classList.add("is-open");
    menuList.setAttribute("aria-hidden", "false");
    menuPanel.setAttribute("data-open", "true");
    menuOpenIcon.setAttribute("aria-expanded", "true");
  }

  function menuClose() {
    menuList.classList.remove("is-open");
    menuList.setAttribute("aria-hidden", "true");
    menuPanel.setAttribute("data-open", "false");
    menuOpenIcon.setAttribute("aria-expanded", "false");
  }

  searchOpenIcon.addEventListener("click", () => {
    searchOpen();
  });

  searchCloseIcon.addEventListener("click", () => {
    searchClose();
  });

  function searchOpen() {
    search.classList.add("is-visible");
    search.setAttribute("aria-hidden", "false");
    searchOpenIcon.setAttribute("aria-expanded", "true");
    setTimeout(function () {
      searchInput.focus();
    }, 250);
  }

  function searchClose() {
    search.classList.remove("is-visible");
    search.setAttribute("aria-hidden", "true");
    searchOpenIcon.setAttribute("aria-expanded", "false");
  }

  searchBox.addEventListener("keydown", function (event) {
    if (event.target == this || event.keyCode == 27) {
      searchClose();
    }
  });

  if (toggleTheme) {
    syncThemeToggle();
    toggleTheme.addEventListener("click", () => {
      darkMode();
    });
  };

  syncThemeMode();

  if (window.matchMedia) {
    var colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    var onColorSchemeChange = function (event) {
      if (getStoredTheme()) return;
      applyTheme(event.matches ? "dark" : "light", false);
    };

    if (colorSchemeQuery.addEventListener) {
      colorSchemeQuery.addEventListener("change", onColorSchemeChange);
    } else if (colorSchemeQuery.addListener) {
      colorSchemeQuery.addListener(onColorSchemeChange);
    }
  }

  window.addEventListener("storage", function (event) {
    if (event.key !== "theme") return;
    syncThemeMode();
  });

  socialLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const socialName = link.dataset.socialName;
      if (!socialName) return;
      trackUmamiEvent(`${toSnakeCase(socialName)}_click`);
    });
  });

  function trackUmamiEvent(eventName, props) {
    if (!eventName || !window.umami) return;
    window.umami.track(eventName, props);
  }

  function toSnakeCase(value) {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }

  // Theme Switcher
  function darkMode() {
    return applyTheme(getResolvedTheme() === "dark" ? "light" : "dark");
  }

  function getStoredTheme() {
    try {
      var storedTheme = localStorage.getItem("theme");
      if (storedTheme === "light" || storedTheme === "dark") return storedTheme;
    } catch (_) {}
    return null;
  }

  function getSystemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light";
  }

  function getResolvedTheme() {
    return html.hasAttribute('dark') ? "dark" : (getStoredTheme() || getSystemTheme());
  }

  function applyTheme(theme, persist) {
    if (persist === undefined) persist = true;

    html.toggleAttribute("dark", theme === "dark");
    html.style.colorScheme = theme;

    if (persist) {
      try {
        localStorage.setItem("theme", theme);
      } catch (_) {}
    }

    syncThemeToggle();
    return theme;
  }

  function syncThemeMode() {
    return applyTheme(getStoredTheme() || getSystemTheme(), false);
  }

  function syncThemeToggle() {
    if (!toggleTheme) return;

    const isDark = getResolvedTheme() === "dark";
    toggleTheme.setAttribute("aria-label", isDark ? "Enable light mode" : "Enable dark mode");
  }

  // =====================
  // Simple Jekyll Search
  // =====================
  const searchInputEl = document.getElementById("js-search-input");
  const searchResultsEl = document.getElementById("js-results-container");
  let hasSearchInit = false;

  function initSearch() {
    if (hasSearchInit || !searchInputEl || !searchResultsEl) return;
    hasSearchInit = true;
    SimpleJekyllSearch({
      searchInput: searchInputEl,
      resultsContainer: searchResultsEl,
      json: "/search.json",
      searchResultTemplate: '{article}',
      noResultsText: '<h3 class="no-results">No results found</h3>'
    });
  }

  if (searchOpenIcon) {
    searchOpenIcon.addEventListener("click", initSearch, { once: true });
  }
  if (searchInputEl) {
    searchInputEl.addEventListener("focus", initSearch, { once: true });
  }


  /* =======================
  // Responsive Videos
  ======================= */
  reframe(".post__content iframe:not(.reframe-off), .page__content iframe:not(.reframe-off)");


  /* =======================
  // LazyLoad Images
  ======================= */
  var lazyLoadInstance = new LazyLoad({
    elements_selector: ".lazy",
    callback_error: (element) => {
      if (!element.dataset.originalSrc) return;
      if (element.dataset.originalSrcset) {
        element.setAttribute("srcset", element.dataset.originalSrcset);
      } else {
        element.removeAttribute("srcset");
      }
      element.src = element.dataset.originalSrc;
    }
  })


  /* =======================
  // Zoom Image
  ======================= */
  const lightense = document.querySelector(".page__content img, .post__content img, .gallery__image img"),
    imageLink = document.querySelectorAll(".page__content a img, .post__content a img, .gallery__image a img");

  if (imageLink) {
    imageLink.forEach(link => link.parentNode.classList.add("image-link"));
    imageLink.forEach(link => link.classList.add("no-lightense"));
  }

  if (lightense) {
    Lightense(".page__content img:not(.no-lightense), .post__content img:not(.no-lightense), .gallery__image img:not(.no-lightense)", {
      padding: 60,
      offset: 30,
      background: "rgba(26, 26, 31, .8)",
      beforeShow(config) {
        if (!config.target.dataset.src) return;
        config.target.dataset.tempSrc = config.target.src;
        config.target.src = config.target.dataset.src;
      },
      afterHide(config) {
        if (!config.target.dataset.src) return;
        config.target.src = config.target.dataset.tempSrc;
        config.target.removeAttribute('data-temp-src');
      }
    });
  }



  /* =================================
  // Smooth scroll to the tags page
  ================================= */
  document.querySelectorAll(".tag__link, .top__link").forEach(anchor => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();

      document.querySelector(this.getAttribute("href")).scrollIntoView({
        behavior: "smooth"
      });
    });
  });


  /* =======================
  // Scroll Top Button
  ======================= */
  btnScrollToTop.addEventListener("click", function () {
    if (window.scrollY != 0) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth"
      })
    }
  });


  /* =======================
  // Tooltips
  ======================= */
  if (window.tippy) {
    window.tippy('.plan-card .tooltip', {
      offset: [0, -4]
    });
  }

  /* =======================
  // Form Cache
  ======================= */

  [...document.querySelectorAll('.form__input:not(.no-cache)')].forEach(input => {
    const fieldId = input.id;
    const formId = input.form.id;
    const formContentOnLoad = JSON.parse(window.sessionStorage.getItem(formId + '-content')) || {};

    if (formContentOnLoad[fieldId]) {
      document.getElementById(fieldId).value = formContentOnLoad[fieldId];
      if (formContentOnLoad[fieldId] === 'on') {
        document.getElementById(fieldId).checked = true;
      }
    }

    input.addEventListener('input', e => {
      const currentContent = JSON.parse(window.sessionStorage.getItem(formId + '-content')) || {};
      if (['radio', 'checkbox'].includes(e.target.type)) {
        [...e.target.closest('.form__group').querySelectorAll('input')].forEach(input => {
          currentContent[input.id] = 'off';
        });
        currentContent[fieldId] = e.target.checked ? 'on' : 'off';
        window.sessionStorage.setItem(formId + '-content', JSON.stringify(currentContent));
      } else {
        currentContent[fieldId] = e.target.value;
        window.sessionStorage.setItem(formId + '-content', JSON.stringify(currentContent));
      }
    });
  });

  /* =======================
  // Toggle Plan Periods
  ======================= */

  const periodSelect = document.querySelector('.period-select');
  if (periodSelect) {
    const periodButtons = periodSelect.querySelectorAll('button');
    const planPeriods = document.querySelectorAll('.plan-card__periods-item');
    const planCards = document.querySelectorAll('.plan-card');

    periodButtons.forEach(button => {
      button.addEventListener('click', () => {
        const period = button.getAttribute('data-period');
        periodButtons.forEach(button => button.classList.remove('button--primary'));
        planCards.forEach(button => button.classList.remove('plan-card--featured'));
        button.classList.add('button--primary');
        planPeriods.forEach(periodElement => {
          const isActive = periodElement.getAttribute('data-period') !== period;
          periodElement.hidden = isActive;
          if (!isActive && periodElement.getAttribute('data-featured') !== null) {
            periodElement.closest('.plan-card').classList.add('plan-card--featured');
          }
        });
      });
    });
  }

  /* =======================
  // Fill On Tour Data
  ======================= */

  initOnTourTable();

  function initOnTourTable() {
    const onTourTable = document.querySelector('table.on-tour');
    const onTourBody = onTourTable?.querySelector('tbody');
    const onTourStatus = document.querySelector('[data-on-tour-status]');
    const onTourTableWrapper = document.querySelector('[data-on-tour-table-wrapper]');
    if (!onTourBody || !onTourStatus || !onTourTableWrapper) return;

    fetch(`${resolveApiBaseUrl()}/tournaments/on-tour`)
      .then(async response => {
        if (!response.ok) throw new Error(`On-tour request failed with ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('On-tour response is not an array');
        return data;
      })
      .then(data => {
        if (!data.length) {
          onTourStatus.textContent = 'Derzeit sind keine Spieler*innen des Syndikats auf Tour.';
          return;
        }

        const fragment = renderTournamentWeeks(data, 4, tournament => {
          const registrationStatus = getTournamentRegistrationStatus(tournament);
          const avatarColor = createTournamentAvatarColor(tournament);
          const initials = getTournamentInitials(tournament.title);
          const players = Array.isArray(tournament.our_players) ? tournament.our_players : [];

          const row = document.createElement('tr');
          row.dataset.href = tournament.link || '';
          if (row.dataset.href) {
            row.tabIndex = 0;
            row.setAttribute('role', 'link');
          }
          row.innerHTML = `
            <td data-label="Status"><span class="tournaments-table__indicator${registrationStatus ? " is-active" : ""}" data-registration-status="${escapeAttribute(registrationStatus)}" aria-label="${escapeAttribute(registrationStatus || "n/a")}"></span></td>
            <td data-label="Turnier"><div class="tournaments-table__name-cell"><span class="avatar tournaments-table__avatar" style="background-color: ${escapeAttribute(avatarColor)};"><span>${escapeHtml(initials)}</span></span><div class="tournaments-table__heading"><div class="tournaments-table__title">${escapeHtml(tournament.title || "Unbenanntes Turnier")}</div></div></div></td>
            <td data-label="Datum">${formatTournamentDateCell(tournament)}</td>
            <td data-label="Spieler*innen">${players.map(player => escapeHtml(String(player.name || '').split(', ').reverse().join(' '))).join(', ')}</td>
          `;

          row.addEventListener('click', () => {
            if (!row.dataset.href) return;
            window.open(row.dataset.href, '_blank', 'noopener');
          });

          row.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            if (!row.dataset.href) return;
            event.preventDefault();
            window.open(row.dataset.href, '_blank', 'noopener');
          });
          return row;
        });
        onTourBody.replaceChildren(fragment);
        onTourTableWrapper.hidden = false;
        onTourStatus.textContent = '';
      })
      .catch(error => {
        console.error('Error fetching on-tour data:', error);
        onTourStatus.textContent = 'Die Turnierdaten sind zurzeit nicht verfügbar. Bitte versuche es später erneut.';
      });
  }


});

function formatDate(date, weekday = true, year = true) {
  const dateOptions = {
    weekday: weekday ? "long" : undefined,
    year: year ? "numeric" : undefined,
    month: "2-digit",
    day: "2-digit"
  };

  return new Date(date).toLocaleDateString("de-DE", dateOptions);
}

function formatTournamentDateCell(tournament) {
  const start = tournament?.dates?.startTournament;
  const end = tournament?.dates?.endTournament;

  if (!start) return '<span class="tournaments-table__date">noch unbekannt</span>';
  if (!end || start === end) {
    return `<span class="tournaments-table__date">${escapeHtml(formatDate(start, false))}</span>`;
  }

  return `<div class="tournaments-table__date tournaments-table__date--range"><span>${escapeHtml(formatDate(start, false))}</span><span>${escapeHtml(formatDate(end, false))}</span></div>`;
}

function getTournamentRegistrationStatus(tournament, freeSpots = getFreeSpots(tournament)) {
  if (freeSpots <= 0) return "already full";

  const registrationDate = tournament?.dates?.startRegistration;
  if (!registrationDate) return "";

  const registrationStartsAt = new Date(registrationDate);
  if (Number.isNaN(registrationStartsAt.getTime())) return "";

  return registrationStartsAt > new Date() ? "registration soon" : "registration open";
}

function getFreeSpots(tournament) {
  const overall = Number(tournament?.spots?.overall);
  const used = Number(tournament?.spots?.used);

  if (!Number.isFinite(overall) || overall <= 0) return 0;
  if (!Number.isFinite(used) || used < 0) return overall;

  return Math.max(overall - used, 0);
}

function getTournamentInitials(title = "") {
  const words = String(title)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!words.length) return "TT";
  return words.map((word) => word.charAt(0).toUpperCase()).join("");
}

function createTournamentAvatarColor(tournament) {
  const source = String(tournament?.event_id || tournament?.title || "0");
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(index);
    hash |= 0;
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}deg 70% 34%)`;
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

// Calendar arithmetic uses UTC after resolving the date in Germany, so browser
// time zones and daylight-saving changes cannot move the Monday boundary.
function getTournamentWeek(dateValue) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const part = type => Number(parts.find(item => item.type === type).value);
  const monday = new Date(Date.UTC(part('year'), part('month') - 1, part('day')));
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  const format = value => value.toLocaleDateString('de-DE', {
    timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric'
  });
  return {key: monday.toISOString(), label: `${format(monday)} – ${format(sunday)}`};
}

function renderTournamentWeeks(tournaments, columnCount, renderRow) {
  const groups = new Map();
  for (const tournament of tournaments) {
    const week = getTournamentWeek(tournament?.dates?.startTournament);
    const key = week?.key || 'unknown';
    if (!groups.has(key)) groups.set(key, {label: week?.label || 'Datum noch unbekannt', tournaments: []});
    groups.get(key).tournaments.push(tournament);
  }

  const fragment = document.createDocumentFragment();
  for (const [, group] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
    const header = document.createElement('tr');
    header.className = 'tournaments-table__week';
    const heading = document.createElement('th');
    heading.colSpan = columnCount;
    heading.textContent = group.label;
    header.append(heading);
    fragment.append(header);
    group.tournaments.sort((a, b) => new Date(a?.dates?.startTournament) - new Date(b?.dates?.startTournament));
    group.tournaments.forEach(tournament => fragment.append(renderRow(tournament)));
  }
  return fragment;
}
