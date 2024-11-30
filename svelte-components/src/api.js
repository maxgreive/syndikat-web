const API_URL = process.env.API_URL || 'https://api.syndikat.golf';

export async function fetchProducts(url, query, endpoint) {
  const data = [];
  const response = await fetch(`${url}/products/${endpoint}/${query}`, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
  const result = await response.json();
  data.push(...result);
  return data;
}