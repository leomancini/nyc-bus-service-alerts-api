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

app.get("/", (req, res) => {
  res.send("Hello world!");
});

app.get("/alerts/today", async (req, res) => {
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

app.get("/alerts/today/summaries", async (req, res) => {
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
    res.status(500).json([
      `Error: Failed to fetch bus alert summaries - ${error.message}`
    ]);
  }
});

app.listen(port, () => {});
