<script>
  import { writable } from "svelte/store";
  import { onMount } from "svelte";
  import { fetchProducts } from "./api";
  import { push, querystring } from "svelte-spa-router";
  import SearchExample from "./SearchExample.svelte";
  import ShopLogos from "./ShopLogos.svelte";
  import ProductCard from "./ProductCard.svelte";
  import Wishlist from "./Wishlist.svelte";
  import { shops } from "./shops.js";

  const activeShops = shops.filter((shop) => !shop.disabled);
  const shopHandles = activeShops.map((shop) => shop.handle);
  const products = writable([]);
  const loading = writable("");
  let initialProducts = [];
  let defaultState = true;

  let shopCount = shopHandles.length;
  const stored = localStorage.sort;
  const sort = writable(stored || "default");
  sort.subscribe((value) => (localStorage.sort = value));

  const wishlist = writable(JSON.parse(localStorage.wishlist || "[]"));
  wishlist.subscribe((products) => localStorage.wishlist = JSON.stringify(products));

  let query = "";
  $: query = query.toLowerCase();
  $: progress = parseInt((shopCount / shopHandles.length) * 100);

  const clearProducts = () => {
    query = "";
    push("/");
    $products = [];
  };

  const getProducts = async () => {
    if (!query) {
      push("/");
      defaultState = true;
      return products.set([]);
    }

    window.plausible =
      window.plausible ||
      function () {
        (window.plausible.q = window.plausible.q || []).push(arguments);
      };
    window.plausible("product-search", {
      props: {
        query: query,
      },
    });

    initialProducts = [];
    defaultState = false;

    push(`/?q=${encodeURIComponent(query)}`);
    products.set([]);
    shopCount = 0;

    for (const shop of shopHandles) {
      loading.set(shop);
      const productResponse = await fetchProducts(query, shop);
      products.update((currentProducts) => [
        ...currentProducts,
        ...productResponse,
      ]);
      shopCount++;
      initialProducts.push(...productResponse);
      handleSort();
    }
    loading.set("");
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

  onMount(async () => {
    document.querySelector("#js-product-input").focus();
    query = new URLSearchParams($querystring).get("q") || "";
    await getProducts();
  });
</script>

<Wishlist {wishlist} />

<form class="search__group">
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
    bind:value={query}
    placeholder="Suche eine Scheibe …"
  />
  <button
    type="submit"
    class="button button--primary"
    on:click|preventDefault={() => getProducts()}
  >
    <i class="ion ion-md-search"></i>
  </button>
</form>

<div class="products-headline">
  <h2>
    {#if $loading || $products.length}
      Produkte
    {:else}
      Los geht's!
    {/if}
    {#if shopCount < shopHandles.length}
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

  {#if $loading}
    <div class="currently-fetching">loading {$loading} …</div>
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
  {#if $loading && shopCount < shopHandles.length && $products.length === 0}
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
              href="/contact"
            >
              Schreib uns über das Kontaktformular
            </a>.
          </p>
        </div>
      {:else}
        <div class="col">
          <p>Keine Produkte für {query} gefunden.</p>
        </div>
      {/if}
    {/each}
  {/if}
</div>

<style>
  form {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
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
