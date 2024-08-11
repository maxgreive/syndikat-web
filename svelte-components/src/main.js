import ProductSearch from './ProductSearch.svelte';

if (document.querySelector('#product-search-app')) {
  new ProductSearch({
    target: document.querySelector('#product-search-app'),
  });
}