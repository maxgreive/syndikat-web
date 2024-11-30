<script>
  import { shops } from "./shops";
  import { onMount } from "svelte";

  onMount(async () => {
    tippy(".tooltip", {});
  });

  export let product;
  const shop = shops.find((shop) => shop.handle === product.store);
  const stockStatusLabels = {
    available: "Auf Lager",
    unavailable: "Nicht auf Lager",
    unknown: "Unbekannt",
  };

  const EURO = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  });

  const trackProduct = (product) => {
    window.plausible =
      window.plausible ||
      function () {
        (window.plausible.q = window.plausible.q || []).push(arguments);
      };
    window.plausible("product-click", {
      props: {
        product: product.title,
        store: product.store,
        price: product.price / 100,
        currency: "EUR",
        url: product.url,
      },
    });
  };
</script>

<div class="article col col-4 col-d-6 col-t-12">
  <div class="article__inner">
    <div class="article__head">
      <a
        href={product.url}
        target="_blank"
        class="article__image"
        on:click={trackProduct(product)}
      >
        {#if product.flightNumbers}
          <ul class="article__flight-numbers">
            {#each Object.values(product.flightNumbers) as flightNumber}
              {#if flightNumber}
                <li>{parseInt(flightNumber)}</li>
              {/if}
            {/each}
          </ul>
        {/if}
        <img
          src={product.image || "/assets/images/image-not-found.jpg"}
          alt={product.title}
          loading="lazy"
          width="200"
          height="200"
        />
      </a>
      {#if shop && shop.shipping && shop.shipping.amount}
        <span
          class="tooltip"
          data-tippy-content={`Versand ${EURO.format(shop.shipping.amount / 100)}${shop.shipping.info}`}
          ><i class="ion ion-md-information-circle-outline"></i></span
        >
      {/if}
    </div>
    <div class="article__content">
      <h2 class="article__title">
        <a href={product.url} target="_blank" on:click={trackProduct(product)}
          >{product.title}</a
        >
      </h2>
      <p>
        <span class={`inventory status-${product.stockStatus}`}
          >{stockStatusLabels[product.stockStatus]}</span
        >
        <strong>{EURO.format(product.price / 100)}</strong>
        <img
          src={`/assets/images/logos/${product.store}-light.png`}
          class="store-logo hide-dark"
          alt="Store Logo"
        />
        <img
          src={`/assets/images/logos/${product.store}-dark.png`}
          class="store-logo hide-light"
          alt="Store Logo"
        />
      </p>
    </div>
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

  .article__flight-numbers {
    position: absolute;
    bottom: 5px;
    opacity: 0.9;
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    display: flex;
    z-index: 1000;
    font-family: monospace;
    border-radius: 4px;
    border: 1px solid var(--background-alt-color);
    box-shadow:
      0 4px 6px -1px rgb(0 0 0 / 0.1),
      0 2px 4px -2px rgb(0 0 0 / 0.1);
    color: var(--text-color);
    background: linear-gradient(
      30deg,
      var(--background-alt-color),
      var(--background-color)
    );
  }

  .article__flight-numbers li {
    list-style: none;
    margin: 0;
    padding: 2px;
  }

  .article__flight-numbers li:last-of-type {
    margin-right: 15px;
  }

  .article__flight-numbers li:first-of-type {
    margin-left: 15px;
  }

  .article__flight-numbers li + li::before {
    content: "•";
    opacity: 0.3;
    margin-right: 7px;
  }

  a.article__image {
    border: 0 !important;
  }

  .article__title a {
    font-weight: inherit;
  }

  .article__title a {
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

  .tooltip {
    position: absolute;
    top: 0.8rem;
    right: 0.8rem;
    color: var(--gray);
  }
</style>
