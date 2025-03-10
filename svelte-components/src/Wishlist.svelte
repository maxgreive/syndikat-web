<script>
  export let wishlist;
  const overlay = document.querySelector(".overlay");

  const toggleAside = () => {
    const aside = document.querySelector("[data-wishlist]");
    const open = aside.getAttribute("aria-hidden") === "false";
    document.body.classList.toggle("no-scroll");

    if (!open) {
      aside.setAttribute("aria-hidden", "false");
      overlay.classList.remove("hide");
    } else {
      aside.setAttribute("aria-hidden", "true");
      overlay.classList.add("hide");
    }
  };

  overlay.addEventListener("click", toggleAside);
</script>

<button
  on:click={toggleAside}
  aria-label="Wunschliste öffnen"
  class="button button--primary wishlist"
>
  <i class="ion ion-md-heart"></i>
  <span>{$wishlist?.length || 0}</span>
</button>

<aside data-wishlist aria-hidden={true}>
  <header class="search__group">
    <h3>Wunschliste</h3>
    <button on:click={toggleAside} class="search__close">
      <i class="ion ion-md-close"></i>
    </button>
  </header>
  <section>
    {#if $wishlist.length === 0}
      <p>Deine Wunschliste ist leer.</p>
    {:else}
      <ul>
        {#each $wishlist as product}
          <li>
            <a href={product.url} target="_blank"
              ><img src={product.image} alt={product.title} /></a
            >
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
            <button
              on:click={() =>
                ($wishlist = $wishlist.filter((p) => p !== product))}
              class="button--remove"
            >
              <i class="ion ion-md-trash"></i>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
  <footer>
    <button on:click={() => ($wishlist = [])} class="button--clear">
      <i class="ion ion-md-trash"></i> Wunschliste leeren
    </button>
  </footer>
</aside>

<style>
  aside {
    display: flex;
    flex-direction: column;
    width: 400px;
    max-width: 100%;
    position: fixed;
    top: 0;
    right: -400px;
    bottom: 0;
    background-color: var(--background-alt-color);
    z-index: 10;
    box-shadow: -2px 0 20px rgba(0, 0, 0, 0.2);

    transition: right 0.3s ease-in-out;
  }

  aside:not([aria-hidden="true"]) {
    right: 0;
  }

  header,
  section,
  footer {
    padding: 0 1rem;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 1rem 0;
    position: relative;
  }

  section {
    flex: 1;
    overflow-y: auto;
  }

  footer {
    margin: 1rem 0;
  }

  h3,
  h4 {
    margin-bottom: 0;
  }

  h4 {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }

  ul {
    list-style: none;
    margin: 0;
  }

  li {
    position: relative;
    display: flex;
    gap: 1rem;
    align-items: center;
    padding: 1rem 2rem 1rem 1rem;
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
    border: 0 !important;
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
    right: 1rem;
    padding: 0;
  }

  button.wishlist {
    position: fixed;
    top: 50vh;
    right: 0;
    transform: translateY(-50%);
    cursor: pointer;
    z-index: 10;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  @media screen and (max-width: 768px) {
    button.wishlist {
      top: 75vh;
      padding: 1rem;
    }
  }

  .button--remove {
    color: var(--text-alt-color);
    border: 0;
    background-color: transparent;
    cursor: pointer;

    position: absolute;
    padding: 1rem;
    top: 0;
    right: 0;
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
