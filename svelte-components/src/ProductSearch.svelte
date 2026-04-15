<script>
  import { writable } from "svelte/store";
  import { onDestroy, onMount } from "svelte";
  import { fetchNewestProducts, streamProducts } from "./api";
  import { push, querystring } from "svelte-spa-router";
  import SearchExample from "./SearchExample.svelte";
  import Awesomplete from "awesomplete";
  import ShopLogos from "./ShopLogos.svelte";
  import ProductCard from "./ProductCard.svelte";
  import Wishlist from "./Wishlist.svelte";
  import { shops } from "./shops.js";

  const activeShops = shops.filter((shop) => !shop.disabled);
  const shopHandles = activeShops.map((shop) => shop.handle);
  const products = writable([]);
  const newProducts = writable([]);
  const loading = writable(false);
  const loadingText = writable("");
  let initialProducts = [];
  let defaultState = true;
  let totalStores = shopHandles.length;
  let activeSource;
  let searchRun = 0;
  let completedStores = new Set();

  let discs = [];

  window.addEventListener("awesomplete-selectcomplete", (event) => {
    query = event.text.value;
    getProducts();
  });

  let shopCount = shopHandles.length;
  const stored = localStorage.sort;
  const sort = writable(stored || "default");
  sort.subscribe((value) => (localStorage.sort = value));

  const wishlist = writable(JSON.parse(localStorage.wishlist || "[]"));
  wishlist.subscribe((products) => localStorage.wishlist = JSON.stringify(products));

  let query = "";
  $: query = query.toLowerCase();
  $: progress = totalStores ? parseInt((shopCount / totalStores) * 100) : 0;

  let searchedQuery = "";

  let searchInputElement;

  const focusSearchInput = () => {
    searchInputElement?.focus();
  };

  const closeActiveSource = () => {
    if (activeSource) {
      activeSource.close();
      activeSource = null;
    }
  };

  const resetSearchProgress = () => {
    completedStores = new Set();
    totalStores = shopHandles.length;
    shopCount = 0;
    loadingText.set("");
  };

  const finishSearch = () => {
    closeActiveSource();
    loading.set(false);
    loadingText.set("");
  };

  const updateLoadingText = () => {
    if (!totalStores || shopCount >= totalStores) {
      loadingText.set("");
      return;
    }

    loadingText.set(`${shopCount}/${totalStores} Shops gescannt`);
  };

  const addProducts = (items) => {
    if (!items?.length) {
      handleSort();
      return;
    }

    initialProducts.push(...items);
    products.update((currentProducts) => [...currentProducts, ...items]);
    handleSort();
  };

  const markStoreCompleted = (store) => {
    if (!store || completedStores.has(store)) return;
    completedStores.add(store);
    shopCount = completedStores.size;
    updateLoadingText();
  };

  const clearProducts = () => {
    closeActiveSource();
    query = "";
    searchedQuery = "";
    push("/");
    initialProducts = [];
    defaultState = true;
    resetSearchProgress();
    loading.set(false);
    products.set([]);
    focusSearchInput();
  };

  const getProducts = async () => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      closeActiveSource();
      query = "";
      push("/");
      defaultState = true;
      resetSearchProgress();
      loading.set(false);
      return products.set([]);
    }

    closeActiveSource();
    const currentRun = ++searchRun;

    window.plausible =
      window.plausible ||
      function () {
        (window.plausible.q = window.plausible.q || []).push(arguments);
      };
    window.plausible("product-search", {
      props: {
        query: normalizedQuery,
      },
    });

    initialProducts = [];
    defaultState = false;
    searchedQuery = normalizedQuery;

    push(`/?q=${encodeURIComponent(normalizedQuery)}`);
    products.set([]);
    resetSearchProgress();
    loading.set(true);
    updateLoadingText();

    activeSource = streamProducts(normalizedQuery, {
      onStart: ({ stores = [] }) => {
        if (currentRun !== searchRun) return;
        totalStores = stores.length || shopHandles.length;
        shopCount = 0;
        updateLoadingText();
      },
      onStore: ({ store, products: streamedProducts = [] }) => {
        if (currentRun !== searchRun) return;
        markStoreCompleted(store);
        addProducts(streamedProducts);
      },
      onStoreError: ({ store }) => {
        if (currentRun !== searchRun) return;
        markStoreCompleted(store);
      },
      onEnd: () => {
        if (currentRun !== searchRun) return;
        shopCount = totalStores;
        finishSearch();
      },
      onServerError: () => {
        if (currentRun !== searchRun) return;
        finishSearch();
      },
      onStreamError: () => {
        if (currentRun !== searchRun) return;
        finishSearch();
      },
    });

    if (!activeSource) {
      console.error("Streaming search is not supported in this browser.");
      finishSearch();
    }
  };

  const handleSort = () => {
    if ($sort === "price-descending")
      return ($products = sortProducts($products, "price"));
    if ($sort === "price-ascending")
      return ($products = sortProducts($products, "price", true));
    if ($sort === "availability")
      return ($products = sortProducts($products, "stockStatus", true));
    return ($products = initialProducts);
  };

  function sortProducts(products, key, reverse) {
    const result = [...products].sort((a, b) => {
      if (a[key] < b[key]) return 1;
      if (a[key] >= b[key]) return -1;
      return 0;
    });

    return reverse ? result.reverse() : result;
  }

  function getDiscLabel(disc) {
    let label = `${disc.brand} ${disc.name}`;
    if (disc.category) label += `<span class="disc-category">${disc.category}</span>`;
    if (disc.speed && disc.glide && disc.turn && disc.fade) {
      label += `
        <div class="disc-flightnumbers">
          <span class="disc-speed">${disc.speed}</span>
          <span class="disc-glide">${disc.glide}</span>
          <span class="disc-turn">${disc.turn}</span>
          <span class="disc-fade">${disc.fade}</span>
        </div>
      `;
    }

    return label;
  }

  onMount(async () => {
    const newest = (await fetchNewestProducts()).slice(0, 6);
    newProducts.set(newest);

    query = new URLSearchParams($querystring).get("q") || "";
    await getProducts();
    // discs are pulled from https://discit-api.fly.dev/disc
    discs = await fetch('/assets/discs.json').then(res => res.json());

    new Awesomplete(searchInputElement, {
      list: discs.map(disc => (
        {
          label: getDiscLabel(disc),
          value: `${disc.name}`
        }
      )),
      filter: (suggestion, input) => Awesomplete.FILTER_CONTAINS(suggestion.value, input),
      minChars: 3,
      maxItems: 20,
      autoFirst: false,
      tabSelect: true,
    });

    focusSearchInput();
  });

  onDestroy(() => {
    closeActiveSource();
  });
</script>

<Wishlist {wishlist} />

<form class="search__group" on:submit|preventDefault={() => getProducts()}>
  {#if query && !$loading}
    <div
      class="search__close"
      on:click={() => clearProducts()}
      on:keydown={() => clearProducts()}
    >
      <i class="ion ion-md-close"></i>
    </div>
  {/if}
  <label for="js-product-input" class="screen-reader-text"
    >Suche nach Produkten</label
  >
  <input
    type="text"
    class="search__text"
    id="js-product-input"
    bind:this={searchInputElement}
    bind:value={query}
    placeholder="Suche eine Scheibe …"
  />
  <button
    type="submit"
    class="button button--primary"
  >
    <i class="ion ion-md-search"></i>
  </button>
</form>

<div class="products-headline animate">
  <h2>
    {#if $loading || $products.length}
      Produkte
    {:else}
      Los geht's!
    {/if}
    {#if $loading && shopCount < totalStores}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        class="circular-progress"
        style="--progress: {progress}"
      >
        <circle class="bg"></circle>
        <circle class="fg"></circle>
      </svg>
    {:else if $products.length}
      <span class="product-count">({$products.length})</span>
    {/if}
  </h2>

  {#if $loadingText}
    <div class="currently-fetching">{$loadingText}</div>
  {/if}

  {#if $products.length}
    <select bind:value={$sort} on:change={handleSort}>
      <option value="default">Standard</option>
      <option value="availability">Verfügbarkeit</option>
      <option value="price-ascending">Preis aufsteigend</option>
      <option value="price-descending">Preis absteigend</option>
    </select>
  {/if}
</div>

<div class="row animate">
  {#if $loading && shopCount < totalStores && $products.length === 0}
    {#each Array(6) as _}
      <div class="skeleton col col-4 col-d-6 col-t-12">
        <div class="skeleton-image"></div>
        <div class="skeleton-text"></div>
      </div>
    {/each}
  {:else}
    {#each $products as product}
      <ProductCard {product} {wishlist} />
    {:else}
      {#if defaultState || !query}
        <div class="col col-12">
          <p>
            Suche zum Beispiel nach
            <SearchExample bind:query text="Harp" cb={getProducts} />,
            <SearchExample bind:query text="Raider" cb={getProducts} /> oder
            <SearchExample bind:query text="Destroyer" cb={getProducts} />.
          </p>
        </div>
        <div class="col col-12">
          <h3>Unterstützte Shops</h3>
        </div>
        <ShopLogos {activeShops} />
        <div class="col col-12">
          <p>
            Ein Store fehlt in der Liste? Du hast Fragen oder Anregungen? <a
              href="/contact/"
            >
              Schreib uns über das Kontaktformular
            </a>.
          </p>
        </div>

        {#if $newProducts.length}
          <div class="col col-12">
            <h3>Neuheiten und Restocks</h3>
            <div class="row">
              {#each $newProducts as product}
                <ProductCard {product} {wishlist} />
              {/each}
            </div>
          </div>
        {/if}
      {:else}
        <div class="col">
          <p>Keine Produkte für { searchedQuery } gefunden.</p>
        </div>
      {/if}
    {/each}
  {/if}
</div>

<style>
  form {
    display: flex;
    gap: 1rem;
    margin: 2rem 0;
  }

  h2 {
    margin-bottom: 0;
  }

  h2 span {
    font-size: 0.75em;
    color: var(--text-alt-color);
  }

  .search__close {
    right: 100px;
    z-index: 1;
  }

  .products-headline {
    display: flex;
    gap: 1rem;
    margin-bottom: 16px;
    align-items: center;
    justify-content: space-between;
  }

  .skeleton {
    border-radius: 5px;
    transition: all 0.3s ease-in-out;
  }

  .skeleton-image {
    width: 100%;
    height: 200px;
    background-color: #ccd0d3;
    border-top-left-radius: 5px;
    border-top-right-radius: 5px;
    animation: loading 4s infinite;
  }

  @keyframes loading {
    0% {
      background-color: #ccd0d3;
    }
    50% {
      background-color: #e2e6e8;
    }
    100% {
      background-color: #ccd0d3;
    }
  }

  .skeleton-text {
    width: 100%;
    height: 1em;
    margin: 1rem 0;
    background: var(--text-alt-color);
  }

  @keyframes background-shine {
    0% {
      background-position: 30%;
    }
    40%,
    100% {
      background-position: -200%;
    }
  }

  .circular-progress {
    --size: 24px;
    --half-size: calc(var(--size) / 2);
    --stroke-width: 3px;
    --radius: calc((var(--size) - var(--stroke-width)) / 2);
    --circumference: calc(var(--radius) * pi * 2);
    --dash: calc((var(--progress) * var(--circumference)) / 100);
    animation: progress-animation 5s linear 0s 1 forwards;
  }

  .circular-progress circle {
    cx: var(--half-size);
    cy: var(--half-size);
    r: var(--radius);
    stroke-width: var(--stroke-width);
    fill: none;
    stroke-linecap: round;
  }

  .circular-progress circle.bg {
    stroke: var(--background-alt-color);
  }

  .circular-progress circle.fg {
    transform: rotate(-90deg);
    transform-origin: var(--half-size) var(--half-size);
    stroke-dasharray: var(--dash) calc(var(--circumference) - var(--dash));
    transition: stroke-dasharray 0.3s linear 0s;
    stroke: var(--button-background-hover);
  }

  @property --progress {
    syntax: "<number>";
    inherits: false;
    initial-value: 0;
  }

  .currently-fetching {
    font-size: 10px;
    flex: 1;
    display: none;
  }

  @media screen and (min-width: 769px) {
    .currently-fetching {
      display: block;
    }
  }
</style>
