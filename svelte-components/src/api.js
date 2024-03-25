const API_URL = 'http://localhost:1111/products';

export async function fetchProducts(query, endpoint) {
  const data = [];
  const response = await fetch(`${API_URL}/${endpoint}/${query}`, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
  const result = await response.json();
  data.push(...result);
  return data;
}