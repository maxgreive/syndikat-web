const DEFAULT_DEV_API_URL = 'http://localhost:8080';
const DEFAULT_PROD_API_URL = 'https://api.syndikat.golf';

function resolveApiUrl() {
  if (process.env.API_URL) {
    return process.env.API_URL;
  }

  if (typeof window !== 'undefined') {
    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    return isLocalhost ? DEFAULT_DEV_API_URL : DEFAULT_PROD_API_URL;
  }

  return DEFAULT_PROD_API_URL;
}

const API_URL = resolveApiUrl();

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
    const response = await fetch(`${API_URL}/products/feed`, {
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
