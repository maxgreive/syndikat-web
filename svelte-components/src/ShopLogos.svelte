<script>
  export let activeShops;
</script>

<div class="supported-shops">
  {#each activeShops as shop}
    <div class="supported-shop">
      <a href={shop.url}
        ><img
          src={`/assets/images/logos/${shop.handle}-light.png`}
          class="hide-dark"
          alt={`${shop.name} Logo`}
          width="100"
          height="32"
        />
        <img
          src={`/assets/images/logos/${shop.handle}-dark.png`}
          class="hide-light"
          alt={`${shop.name} Logo`}
          width="100"
          height="32"
        /></a
      >
    </div>
  {/each}
</div>

<style>
  .supported-shops {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 2rem;
  }

  .supported-shop {
    filter: grayscale(1);
    opacity: 0.7;
    transition: all 0.2s ease;
  }

  @media (hover: hover) {
    .supported-shop:hover {
      filter: grayscale(0);
      opacity: 1;
    }
  }

  .supported-shop a {
    border-bottom: 0!important;
    display: block;
    padding: 1rem;
  }

  .supported-shop img {
    border-radius: 0;
    height: 32px;
    width: 100px;
    object-fit: contain;
  }
</style>
