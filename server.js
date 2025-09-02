import express from "express";
import dotenv from "dotenv";
import {
  cache,
  isCacheValid,
  fetchFromAPI,
  updateCacheInBackground,
  getSummariesFromData,
  formatAlertsResponse
} from "./utils/index.js";

dotenv.config();

const app = express();
const port = 3114;

// API Key authentication middleware
const requireApiKey = (req, res, next) => {
  const providedApiKey = req.query.apiKey;
  const validApiKey = process.env.NOSHADOWS_NYC_BUS_SERVICE_ALERTS_API_KEY;

  if (!validApiKey) {
    return res.status(500).json({
      error: "Server configuration error",
      message: "API key not configured on server",
      timestamp: new Date().toISOString()
    });
  }

  if (!providedApiKey) {
    return res.status(401).json({
      error: "Unauthorized",
      message:
        "API key is required. Please provide apiKey parameter in the URL",
      timestamp: new Date().toISOString()
    });
  }

  if (providedApiKey !== validApiKey) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid API key",
      timestamp: new Date().toISOString()
    });
  }

  next();
};

app.get("/", (req, res) => {
  res.send("Hello world!");
});

app.get("/alerts/today", requireApiKey, async (req, res) => {
  try {
    // Check if we have valid cached data
    if (isCacheValid()) {
      // Return cached data immediately - no background update needed
      const result = formatAlertsResponse(cache.data, cache.timestamp);
      return res.json(result);
    }

    // Check if we have any cached data (even if expired)
    if (cache.data) {
      // Return cached data immediately
      const result = formatAlertsResponse(cache.data, cache.timestamp);
      res.json(result);

      // Update cache in background (don't await)
      updateCacheInBackground().catch(() => {});
      return;
    }

    // No cache exists - need to fetch data for the first time
    try {
      const freshData = await fetchFromAPI();
      cache.data = freshData;
      cache.timestamp = Date.now();

      const result = formatAlertsResponse(freshData, cache.timestamp);
      res.json(result);
    } catch (fetchError) {
      throw fetchError;
    }
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch bus alerts",
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get("/alerts/today/summaries", requireApiKey, async (req, res) => {
  try {
    // Parse query parameters
    const maxCharacters = parseInt(req.query.maxCharacters) || null;
    const maxStrings = parseInt(req.query.maxStrings) || 50; // Default to 50 strings

    // Check if we have valid cached data
    if (isCacheValid()) {
      const summaries = getSummariesFromData(
        cache.data,
        maxCharacters,
        maxStrings
      );
      return res.json(summaries);
    }

    // Check if we have any cached data (even if expired)
    if (cache.data) {
      const summaries = getSummariesFromData(
        cache.data,
        maxCharacters,
        maxStrings
      );
      res.json(summaries);

      // Update cache in background (don't await)
      updateCacheInBackground().catch(() => {});
      return;
    }

    // No cache exists - need to fetch data for the first time
    try {
      const freshData = await fetchFromAPI();
      cache.data = freshData;
      cache.timestamp = Date.now();

      const summaries = getSummariesFromData(
        freshData,
        maxCharacters,
        maxStrings
      );
      res.json(summaries);
    } catch (fetchError) {
      throw fetchError;
    }
  } catch (error) {
    res
      .status(500)
      .json([`Error: Failed to fetch bus alert summaries - ${error.message}`]);
  }
});

app.listen(port, () => {});
