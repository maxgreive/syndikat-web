const API_URL = 'http://127.0.0.1:8080/products';

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