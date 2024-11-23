document.addEventListener("DOMContentLoaded", function () {
  'use strict';

  var html = document.querySelector('html'),
    menuOpenIcon = document.querySelector(".icon__menu"),
    menuCloseIcon = document.querySelector(".nav__icon-close"),
    menuList = document.querySelector(".main-nav"),
    searchOpenIcon = document.querySelector(".icon__search"),
    searchCloseIcon = document.querySelector("[data-search-close]"),
    instagramIcon = document.querySelector(".icon__instagram"),
    searchInput = document.querySelector(".search__text"),
    search = document.querySelector(".search"),
    searchBox = document.querySelector(".search__box"),
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
  }

  function menuClose() {
    menuList.classList.remove("is-open");
  }

  searchOpenIcon.addEventListener("click", () => {
    searchOpen();
  });

  searchCloseIcon.addEventListener("click", () => {
    searchClose();
  });

  function searchOpen() {
    search.classList.add("is-visible");
    setTimeout(function () {
      searchInput.focus();
    }, 250);
  }

  function searchClose() {
    search.classList.remove("is-visible");
  }

  searchBox.addEventListener("keydown", function (event) {
    if (event.target == this || event.keyCode == 27) {
      search.classList.remove('is-visible');
    }
  });

  if (toggleTheme) {
    toggleTheme.addEventListener("click", () => {
      darkMode();
    });
  };

  instagramIcon.addEventListener("click", () => {
    window.open("https://instagram.com/syndikat.golf", "_blank");
    window.plausible && window.plausible("instagram-click");
  });

  // Theme Switcher
  function darkMode() {
    if (document.documentElement.hasAttribute('dark')) {
      return setDarkTheme();
    }
    return setDarkTheme(true);
  }

  function setDarkTheme(isDark) {
    sessionStorage.setItem("theme", isDark ? "dark" : "light");

    if (isDark) {
      return document.documentElement.setAttribute("dark", "");
    }
    return document.documentElement.removeAttribute("dark");
  }


  // =====================
  // Simple Jekyll Search
  // =====================
  SimpleJekyllSearch({
    searchInput: document.getElementById("js-search-input"),
    resultsContainer: document.getElementById("js-results-container"),
    json: "/search.json",
    searchResultTemplate: '{article}',
    noResultsText: '<h3 class="no-results">No results found</h3>'
  });


  /* =======================
  // Responsive Videos
  ======================= */
  reframe(".post__content iframe:not(.reframe-off), .page__content iframe:not(.reframe-off)");


  /* =======================
  // LazyLoad Images
  ======================= */
  var lazyLoadInstance = new LazyLoad({
    elements_selector: ".lazy"
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
  tippy('.tooltip');

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
});

function formatDate(date, weekday = true) {
  const dateOptions = {
    weekday: weekday ? "long" : undefined,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  };

  return new Date(date).toLocaleDateString("de-DE", dateOptions);
}
