const API_URL = process.env.API_URL || 'https://api.syndikat.golf';

export async function fetchProducts(query, endpoint) {
  const data = [];
  try {
    const response = await fetch(`${API_URL}/products/${endpoint}/${query}`, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
    if (!response.ok) {
      console.error(`Fetch error: ${response.status} ${response.statusText}`);
      return data;
    }
    const result = await response.json();
    data.push(...result);
    return data;
  } catch (err) {
    console.error("Uncaught (in promise) TypeError: NetworkError when attempting to fetch resource.", err);
    return data;
  }
}

export async function fetchNewestProducts() {
  const data = [];
  try {
    const response = await fetch(`${API_URL}/product-feed`, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
    if (!response.ok) {
      console.error(`Fetch error: ${response.status} ${response.statusText}`);
      return data;
    }
    const result = await response.json();
    data.push(...result);
    return data;
  } catch (err) {
    console.error("Uncaught (in promise) TypeError: NetworkError when attempting to fetch resource.", err);
    return data;
  }
}