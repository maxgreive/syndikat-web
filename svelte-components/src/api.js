const API_URL = process.env.API_URL || '//localhost:1337';

export async function fetchProducts(query, endpoint) {
  const data = [];
  const response = await fetch(`${API_URL}/products/${endpoint}/${query}`, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
  const result = await response.json();
  data.push(...result);
  return data;
}