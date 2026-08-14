const shopDataElement =
  typeof document === "undefined"
    ? null
    : document.getElementById("product-search-shops");

export const shops = shopDataElement?.textContent
  ? JSON.parse(shopDataElement.textContent)
  : [];
