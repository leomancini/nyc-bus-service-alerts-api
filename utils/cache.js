import dotenv from "dotenv";
dotenv.config();

// Cache configuration
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
let cache = {
  data: null,
  timestamp: null,
  isUpdating: false
};

// Function to check if cache is still valid
export function isCacheValid() {
  return (
    cache.data &&
    cache.timestamp &&
    Date.now() - cache.timestamp < CACHE_DURATION
  );
}

// Function to fetch fresh data from API
export async function fetchFromAPI() {
  const apiKey = process.env.MTA_BUS_TIME_API_KEY;
  if (!apiKey) {
    throw new Error("MTA_BUS_TIME_API_KEY not configured in .env file");
  }

  const apiUrl = `https://api.prod.obanyc.com/api/siri/vehicle-monitoring.json?key=${apiKey}`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return await response.json();
}

// Function to update cache in background
export async function updateCacheInBackground() {
  if (cache.isUpdating) return; // Prevent multiple simultaneous updates

  cache.isUpdating = true;
  try {
    const freshData = await fetchFromAPI();
    cache.data = freshData;
    cache.timestamp = Date.now();
  } catch (error) {
    // Don't update cache on error, keep existing data
  } finally {
    cache.isUpdating = false;
  }
}

// Export cache object for direct access
export { cache };
