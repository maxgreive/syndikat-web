<script>
  export let wishlist;

  const toggleAside = () => {
    const aside = document.querySelector("aside");
    const ariaHidden = aside.getAttribute("aria-hidden") === "true";
    aside.setAttribute("aria-hidden", !ariaHidden);
  };
</script>

<button
  on:click={toggleAside}
  aria-label="Wunschliste öffnen"
  class="button button--primary wishlist"
>
  <i class="ion ion-md-heart"></i>
  <span>{$wishlist.length}</span>
</button>

<aside aria-hidden="true">
  <header class="search__group">
    <h3>Wunschliste</h3>
    <button on:click={toggleAside} class="search__close">
      <i class="ion ion-md-close"></i>
    </button>
  </header>
  {#if $wishlist.length === 0}
    <p>Deine Wunschliste ist leer.</p>
  {:else}
    <ul>
      {#each $wishlist as product}
        <li>
          <a href={product.url} target="_blank"><img src={product.image} alt={product.title} /></a>
          <a href={product.url} target="_blank" class="product__content">
            <h4>{product.title}</h4>
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
          </a>
        </li>
      {/each}
    </ul>
  {/if}
  <button on:click={() => ($wishlist = [])} class="button--clear">
    <i class="ion ion-md-trash"></i> Wunschliste leeren
  </button>
</aside>

<style>
  aside {
    display: flex;
    flex-direction: column;
    width: 400px;
    max-width: 100%;
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    background-color: var(--background-alt-color);
    transform: translateX(100%);
    z-index: 1;
    padding: 1rem;
    box-shadow: -2px 0 20px rgba(0, 0, 0, 0.2);

    transition: transform 0.3s ease-in-out;
  }

  aside:not([aria-hidden="true"]) {
    transform: translateX(0);
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    position: relative;
  }

  h3,
  h4 {
    margin-bottom: 0;
  }

  ul {
    list-style: none;
    margin: 0;
    flex: 1;
    overflow-y: auto;
  }

  li {
    display: flex;
    gap: 1rem;
    align-items: center;
    padding: 1rem;
    background-color: var(--background-color);
  }

  li a img {
    width: 80px;
    height: 80px;
    object-fit: contain;
    flex: 0 0 80px;
  }

  li > .product__content {
    flex: 1;
  }

  a {
    border: 0!important;
  }

  a:hover {
    text-decoration: none;
  }

  .store-logo {
    width: auto;
    height: 20px;
    border-radius: 0;
    margin-left: auto;
    margin-top: 1rem;
  }

  .search__close {
    border: 0;
    right: 0;
  }

  button.wishlist {
    position: fixed;
    top: 50dvh;
    right: 0;
    transform: translateY(-50%);
    cursor: pointer;
    z-index: 1;
  }

  @media screen and (max-width: 768px) {
    button.wishlist {
      top: 75dvh;
      padding: 1rem;
    }
  }

  .button--clear {
    color: var(--red);
    border: 0;
    background-color: transparent;
    margin-top: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    width: 100%;
    cursor: pointer;
  }
</style>
