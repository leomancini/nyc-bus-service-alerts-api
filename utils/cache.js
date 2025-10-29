import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes - cache is valid for this long
const CACHE_DIR = path.join(__dirname, "..", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "cache.json");

// In-memory state tracking
let cacheState = {
  isUpdating: false,
  lastChecked: null
};

// Ensure cache directory exists
async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create cache directory:", error.message);
  }
}

// Function to read complete cache (data + metadata)
async function readCacheFile() {
  try {
    const cacheContent = await fs.readFile(CACHE_FILE, "utf8");
    return JSON.parse(cacheContent);
  } catch (error) {
    return null;
  }
}

// Function to write complete cache (data + metadata)
async function writeCacheFile(data, timestamp) {
  try {
    await ensureCacheDir();
    const cacheContent = {
      timestamp,
      data
    };
    await fs.writeFile(CACHE_FILE, JSON.stringify(cacheContent));
  } catch (error) {
    console.error("Failed to write cache file:", error.message);
    throw error;
  }
}

// Function to check if cache is still valid
export async function isCacheValid() {
  try {
    const cache = await readCacheFile();
    if (!cache || !cache.timestamp || !cache.data) {
      return false;
    }

    return Date.now() - cache.timestamp < CACHE_DURATION;
  } catch (error) {
    return false;
  }
}

// Function to check if any cache exists (even if expired)
export async function hasCachedData() {
  try {
    const cache = await readCacheFile();
    return cache && cache.timestamp && cache.data;
  } catch {
    return false;
  }
}

// Function to read cached data
export async function getCachedData() {
  try {
    const cache = await readCacheFile();
    if (!cache || !cache.data) {
      return null;
    }

    return {
      data: cache.data,
      timestamp: cache.timestamp
    };
  } catch (error) {
    console.error("Failed to read cached data:", error.message);
    return null;
  }
}

// Memory limits configuration
const MEMORY_LIMITS = {
  maxHeapUsed: 500 * 1024 * 1024, // 500MB heap limit
  maxRSS: 1000 * 1024 * 1024, // 1GB RSS limit
  warningThreshold: 0.8 // Warn at 80% of limits
};

// Function to log memory usage and check limits
function logMemoryUsage(context = "") {
  const memUsage = process.memoryUsage();
  const memInfo = {
    rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
  };

  console.log(`Memory Usage ${context}:`, memInfo);

  // Check memory limits
  const heapUsedPercent = memUsage.heapUsed / MEMORY_LIMITS.maxHeapUsed;
  const rssPercent = memUsage.rss / MEMORY_LIMITS.maxRSS;

  if (
    heapUsedPercent > MEMORY_LIMITS.warningThreshold ||
    rssPercent > MEMORY_LIMITS.warningThreshold
  ) {
    console.warn(
      `Memory usage warning - Heap: ${Math.round(
        heapUsedPercent * 100
      )}%, RSS: ${Math.round(rssPercent * 100)}%`
    );

    // Force garbage collection if available and we're over 90%
    if ((heapUsedPercent > 0.9 || rssPercent > 0.9) && global.gc) {
      console.log("Forcing garbage collection due to high memory usage");
      global.gc();
    }
  }

  // Return memory info for potential error handling
  return {
    heapUsedPercent,
    rssPercent,
    isOverLimit: heapUsedPercent > 1.0 || rssPercent > 1.0
  };
}

// Function to fetch fresh data from API and cache it
export async function fetchFromAPI() {
  const apiKey = process.env.MTA_BUS_TIME_API_KEY;
  if (!apiKey) {
    throw new Error("MTA_BUS_TIME_API_KEY not configured in .env file");
  }

  const memCheck1 = logMemoryUsage("before API fetch");

  // Check if we're already at memory limits before fetching
  if (memCheck1.isOverLimit) {
    throw new Error("Memory limit exceeded before API fetch");
  }

  const apiUrl = `https://api.prod.obanyc.com/api/siri/vehicle-monitoring.json?key=${apiKey}`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const data = await response.json();
  const memCheck2 = logMemoryUsage("after API fetch and JSON parse");

  // Check memory after parsing JSON
  if (memCheck2.isOverLimit) {
    console.error("Memory limit exceeded after JSON parse - forcing cleanup");
    if (global.gc) {
      global.gc();
      logMemoryUsage("after emergency garbage collection");
    }
  }

  // Cache the data to file system
  await cacheDataToFile(data);
  logMemoryUsage("after caching to file");

  return data;
}

// Function to cache data to file system
async function cacheDataToFile(data) {
  try {
    const timestamp = Date.now();
    await writeCacheFile(data, timestamp);
    console.log(`Data cached to file at ${new Date(timestamp).toISOString()}`);
  } catch (error) {
    console.error("Failed to cache data to file:", error.message);
    throw error;
  }
}

// Function to update cache in background
export async function updateCacheInBackground() {
  if (cacheState.isUpdating) return; // Prevent multiple simultaneous updates

  cacheState.isUpdating = true;
  try {
    logMemoryUsage("before cache update");
    await fetchFromAPI(); // This will automatically cache to file
    logMemoryUsage("after cache update");

    // Force garbage collection if available (only in development)
    if (global.gc && process.env.NODE_ENV !== "production") {
      global.gc();
      logMemoryUsage("after garbage collection");
    }
  } catch (error) {
    // Don't update cache on error, keep existing data
    console.error("Cache update failed:", error.message);
  } finally {
    cacheState.isUpdating = false;
  }
}

// Function to clean up old cache files (optional maintenance)
export async function cleanupOldCacheFiles() {
  try {
    const cache = await readCacheFile();
    if (
      cache &&
      cache.timestamp &&
      Date.now() - cache.timestamp > CACHE_DURATION * 4
    ) {
      // Remove cache file if it's very old (4x cache duration)
      await fs.unlink(CACHE_FILE).catch(() => {});
      console.log("Cleaned up old cache file");
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}
