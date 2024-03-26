<script>
  import { writable } from "svelte/store";
  import { onMount } from "svelte";
  import { fetchProducts } from "./api";
  import { push, querystring } from "svelte-spa-router";

  const products = writable([]);
  const loading = writable("");
  let initialProducts = [];
  let defaultState = true;

  const endpoints = [
    "chooseyourdisc",
    "insidethecircle",
    "discwolf",
    "frisbeeshop",
    "discgolfstore",
    "crosslap",
    "thrownatur",
    "birdieshop",
    "discgolf4you",
  ];

  let shopCount = endpoints.length;
  const stored = localStorage.sort;
  const sort = writable(stored || "default");
  sort.subscribe((value) => (localStorage.sort = value));

  const stockStatusLabels = {
    available: "Auf Lager",
    unavailable: "Nicht auf Lager",
    unknown: "Unbekannt",
  };
  let query = "";
  $: query = query.toLowerCase();
  $: progress = parseInt((shopCount / endpoints.length) * 100);

  const getProducts = async () => {
    if (!query) {
      push("/");
      defaultState = true;
      return products.set([]);
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "product-search",
      query: query,
    });

    initialProducts = [];
    defaultState = false;

    push(`/?q=${encodeURIComponent(query)}`);
    products.set([]);
    shopCount = 0;

    for (const endpoint of endpoints) {
      loading.set(endpoint);
      const productResponse = await fetchProducts(query, endpoint);
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

  const EURO = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  });

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
    query = new URLSearchParams($querystring).get("q") || "";
    await getProducts();
  });
</script>

<form class="search__group">
  <input
    type="text"
    class="search__text"
    bind:value={query}
    placeholder="Suchen …"
  />
  <button
    type="submit"
    class="button button--primary"
    on:click|preventDefault={() => getProducts()}
  >
    Suchen
  </button>
</form>

<div class="products-headline">
  <h2>
    Produkte
    {#if shopCount < endpoints.length}
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

  <select bind:value={$sort} on:change={handleSort}>
    <option value="default">Standard</option>
    <option value="availability">Verfügbarkeit</option>
    <option value="price-ascending">Preis aufsteigend</option>
    <option value="price-descending">Preis absteigend</option>
  </select>
</div>

<div class="row animate">
  {#if $loading && shopCount < endpoints.length && $products.length === 0}
    {#each Array(6) as _}
      <div class="skeleton col col-4 col-d-6 col-t-12">
        <div class="skeleton-image"></div>
        <div class="skeleton-text"></div>
      </div>
    {/each}
  {:else}
    {#each $products as product}
      <div class="article col col-4 col-d-6 col-t-12">
        <div class="article__inner">
          <div class="article__head">
            <a href={product.url} target="_blank" class="article__image">
              <img
                src={product.image || "/assets/images/image-not-found.jpg"}
                alt={product.title}
                loading="lazy"
                width="200"
                height="200"
              />
            </a>
          </div>
          <div class="article__content">
            <h2 class="article__title">
              <a href={product.url} target="_blank">{product.title}</a>
            </h2>
            <p>
              <span class={`inventory status-${product.stockStatus}`}
                >{stockStatusLabels[product.stockStatus]}</span
              >
              <strong>{EURO.format(product.price / 100)}</strong>
              <img src={product.store} class="store-logo" alt="Store Logo" />
            </p>
          </div>
        </div>
      </div>
    {:else}
      {#if defaultState || !query}
        <div class="col">
          <p>
            Suche zum Beispiel nach <a
              href={null}
              on:click|preventDefault={() => {
                query = "Westside Harp";
                getProducts();
              }}>"Westside Harp"</a
            >
            oder
            <a
              href={null}
              on:click|preventDefault={() => {
                query = "Innova Destroyer";
                getProducts();
              }}>"Innova Destroyer"</a
            >.
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
  .product-image-wrapper {
    aspect-ratio: 1 / 1;
  }

  .article__image {
    padding-bottom: 100%;
    background: none;
  }

  a.article__image {
    border: 0 !important;
  }

  .article__title a {
    font-weight: inherit;
  }

  .article__title a:hover {
    border: 0;
  }

  .store-logo {
    border-radius: 0;
    mix-blend-mode: multiply;
    max-width: 75px;
    max-height: 28px;
    position: absolute;
    bottom: 2rem;
    right: 1rem;
  }

  form {
    display: flex;
    gap: 1rem;
    align-items: center;
    padding-top: 2rem;
  }

  h2 {
    margin-bottom: 0;
  }

  h2 span {
    font-size: 0.75em;
    color: var(--text-alt-color);
  }

  .search__text {
    border: 0 !important;
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

  .inventory {
    display: block;
    font-size: 0.8em;
    margin-top: 0.6rem;
  }

  .status-available::before {
    background: #4caf50;
  }

  .status-unavailable::before {
    background: #f44336;
  }

  .status-unknown::before {
    background: #9e9e9e;
  }

  .inventory::before {
    margin: 0 4px 2px 0;
    width: 8px;
    height: 8px;
    content: "";
    display: inline-block;
    border-radius: 50%;
  }

  select {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml;utf8,<svg fill='black' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>");
    background-repeat: no-repeat;
    background-position-x: calc(100% - 16px);
    background-position-y: 50%;
    padding: 20px 40px 20px 26px;
    background-color: var(--background-alt-color);
    color: var(--heading-font-color);
    border: none;
    font-weight: 700;
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
