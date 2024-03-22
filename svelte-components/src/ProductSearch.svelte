<script>
  import { writable } from "svelte/store";
  import { onMount } from "svelte";
  import { fetchProducts } from "./api";
  import { push, querystring } from "svelte-spa-router";

  const products = writable([]);
  const loading = writable(false);
  let originalProducts = [];
  let defaultState = true;

  const endpoints = [
    "crosslap",
    "frisbeeshop",
    "discgolfstore",
    "thrownatur",
    "insidethecircle",
  ];

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

  const getProducts = async () => {
    if (!query) {
      push("/");
      defaultState = true;
      return products.set([]);
    }
    defaultState = false;

    push(`/?q=${encodeURIComponent(query)}`);
    loading.set(true);
    const promises = endpoints.map((endpoint) =>
      fetchProducts(query, endpoint),
    );
    const results = await Promise.all(promises);

    products.set(results.flat());
    loading.set(false);
    originalProducts = results.flat();
    handleSort();
  };

  const handleSort = () => {
    if ($sort === "default") return ($products = originalProducts);
    const sortedProducts = $products.sort((a, b) => {
      if (parseFloat(a.price) < parseFloat(b.price)) return 1;
      if (parseFloat(a.price) > parseFloat(b.price)) return -1;
      return 0;
    });

    if ($sort === "price-ascending")
      return ($products = sortedProducts.reverse());
    return ($products = sortedProducts);
  };

  onMount(async () => {
    query = new URLSearchParams($querystring).get("q") || "";
    await getProducts();
    handleSort();
  });
</script>

<form class="search__group">
  <input
    type="text"
    class="search__text"
    bind:value={query}
    placeholder="Suche nach Produkten"
  />
  <button
    type="submit"
    class="button button--primary"
    on:click|preventDefault={() => {
      products.set(() => []);
      getProducts();
    }}
  >
    Suchen
  </button>
</form>
<div class="products-headline">
  <h2>
    Produkte{#if $products.length}<span class="product-count"
        >({$products.length})</span
      >{/if}
  </h2>
  <select bind:value={$sort} on:change={handleSort}>
    <option value="default">Standard</option>
    <option value="price-ascending">Preis aufsteigend</option>
    <option value="price-descending">Preis absteigend</option>
  </select>
</div>
<div class="container">
  <div class="row animate">
    {#if $loading}
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
                  src={product.image}
                  alt={product.title}
                  loading="lazy"
                  width="200"
                  height="200"
                />
              </a>
            </div>
            <div class="article__content">
              <h2 class="article__title"><a href={product.url} target="_blank">{product.title}</a></h2>
              <p>
                <span class={`inventory status-${product.stockStatus}`}
                  >{stockStatusLabels[product.stockStatus]}</span
                >
                <strong>{product.price} €</strong>
                <img src={product.store} class="store-logo" alt="Store Logo" />
              </p>
            </div>
          </div>
        </div>
      {:else}
        {#if defaultState}
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
        {:else}
          <p>Keine Produkte für {query} gefunden.</p>
        {/if}
      {/each}
    {/if}
  </div>
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

  .product-count {
    margin-left: 0.5rem;
  }

  .store-logo {
    border-radius: 0;
    mix-blend-mode: multiply;
    width: 75px;
    height: auto;
    max-width: 100%;
    position: absolute;
    bottom: 1rem;
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
    font-size: 0.8em;
    color: var(--text-alt-color);
  }

  .products-headline {
    display: flex;
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
</style>
