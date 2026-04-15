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

export function streamProducts(query, callbacks = {}) {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
    return null;
  }

  const source = new EventSource(
    `${API_URL}/products/search-stream/${encodeURIComponent(query)}`,
  );

  const parseEventData = (event) => {
    if (typeof event?.data !== 'string' || !event.data.length) return null;

    try {
      return JSON.parse(event.data);
    } catch (err) {
      console.error('Failed to parse product stream event.', err);
      return null;
    }
  };

  const bind = (eventName, callback) => {
    if (!callback) return;

    source.addEventListener(eventName, (event) => {
      const data = parseEventData(event);
      if (!data) return;
      callback(data, event);
    });
  };

  bind('start', callbacks.onStart);
  bind('store', callbacks.onStore);
  bind('store-error', callbacks.onStoreError);
  bind('end', callbacks.onEnd);
  bind('error', callbacks.onServerError);

  if (callbacks.onStreamError) {
    source.onerror = (event) => {
      if (typeof event?.data === 'string' && event.data.length) return;
      callbacks.onStreamError(event);
    };
  }

  return source;
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
