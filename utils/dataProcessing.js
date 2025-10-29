import { isRelevantForToday, isWithinDurationLimit } from "./dateUtils.js";

// Function to extract and process situations from API data
export function extractSituations(data) {
  const situations =
    data?.Siri?.ServiceDelivery?.SituationExchangeDelivery?.[0]?.Situations
      ?.PtSituationElement || [];

  // Log memory usage for large datasets
  if (situations.length > 1000) {
    const memUsage = process.memoryUsage();
    console.log(
      `Processing ${situations.length} situations, heap used: ${Math.round(
        memUsage.heapUsed / 1024 / 1024
      )}MB`
    );
  }

  return situations;
}

// Helper function to check if a situation affects routes with a specific prefix
function affectsRoutesWithPrefix(situation, routes) {
  // Handle cases where Affects structure might be different
  if (!situation.Affects?.VehicleJourneys?.AffectedVehicleJourney) {
    return false;
  }

  const affectedRoutes =
    situation.Affects.VehicleJourneys.AffectedVehicleJourney.map(
      (journey) => journey.LineRef?.replace(/^(MTA NYCT_|MTABC_)/, "") || ""
    ).filter(Boolean) || [];

  // If no prefix specified or "ALL", include all routes
  if (!routes || routes.toUpperCase() === "ALL") {
    return true;
  }

  return affectedRoutes.some((route) => route.startsWith(routes.toUpperCase()));
}

// Function to filter and sort situations for today
export function processTodaysSituations(
  situations,
  maxDuration = null,
  routes = "Q"
) {
  const todaysSituations = situations.filter((situation) => {
    return (
      isRelevantForToday(situation) &&
      isWithinDurationLimit(situation, maxDuration) &&
      affectsRoutesWithPrefix(situation, routes)
    );
  });

  // Sort by start time (most recent first), fallback to creation time
  todaysSituations.sort((a, b) => {
    const dateA = a.PublicationWindow?.StartTime
      ? new Date(a.PublicationWindow.StartTime)
      : a.CreationTime
      ? new Date(a.CreationTime)
      : new Date(0);
    const dateB = b.PublicationWindow?.StartTime
      ? new Date(b.PublicationWindow.StartTime)
      : b.CreationTime
      ? new Date(b.CreationTime)
      : new Date(0);
    return dateB - dateA;
  });

  return todaysSituations;
}

// Helper function to format time as "3:32pm"
function formatTime(date) {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";

  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'

  const minutesStr = minutes < 10 ? `0${minutes}` : minutes;

  return `${hours}:${minutesStr}${ampm}`;
}

// Function to format summary with effective dates
export function formatSummaryWithDates(situation) {
  let summary = situation.Summary;
  if (!summary) return null;

  // Strip trailing period from summary and replace newlines with spaces
  summary = summary.replace(/\.$/, "");
  summary = summary.replace(/\n/g, " ");

  // Format effective dates with full month names
  const startDateObj = situation.PublicationWindow?.StartTime
    ? new Date(situation.PublicationWindow.StartTime)
    : null;
  const endDateObj = situation.PublicationWindow?.EndTime
    ? new Date(situation.PublicationWindow.EndTime)
    : null;

  // Add date info to summary with readable formatting
  if (startDateObj && endDateObj) {
    const startMonth = startDateObj.getMonth();
    const startDay = startDateObj.getDate();
    const startYear = startDateObj.getFullYear();

    const endMonth = endDateObj.getMonth();
    const endDay = endDateObj.getDate();
    const endYear = endDateObj.getFullYear();

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ];

    // Check if dates are the same
    if (
      startMonth === endMonth &&
      startDay === endDay &&
      startYear === endYear
    ) {
      const formattedDate = `${monthNames[startMonth]} ${startDay}, ${startYear}`;
      summary = `${formattedDate}: ${summary}`;
    } else if (startYear === endYear) {
      // Same year
      if (startMonth === endMonth) {
        // Same month and year: "Sep 1-2, 2025"
        const formattedDate = `${monthNames[startMonth]} ${startDay}-${endDay}, ${startYear}`;
        summary = `${formattedDate}: ${summary}`;
      } else {
        // Different months, same year: "Sep 23 - Oct 3, 2025"
        const formattedDate = `${monthNames[startMonth]} ${startDay} - ${monthNames[endMonth]} ${endDay}, ${startYear}`;
        summary = `${formattedDate}: ${summary}`;
      }
    } else {
      // Different years: "Dec 12, 2025 - Jan 3, 2026"
      const startFormatted = `${monthNames[startMonth]} ${startDay}, ${startYear}`;
      const endFormatted = `${monthNames[endMonth]} ${endDay}, ${endYear}`;
      summary = `${startFormatted} - ${endFormatted}: ${summary}`;
    }
  } else if (startDateObj) {
    const startMonth = startDateObj.getMonth();
    const startDay = startDateObj.getDate();
    const startYear = startDateObj.getFullYear();
    const startTime = formatTime(startDateObj);
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ];
    const formattedDate = `${monthNames[startMonth]} ${startDay}, ${startYear} ${startTime}`;
    summary = `${formattedDate} - now: ${summary}`;
  }

  return summary;
}

// Helper function to wrap text into lines without breaking words - with word preservation verification
function wrapTextIntoLines(text, maxCharacters) {
  if (!text || !maxCharacters) return [""];

  // Clean up text: replace newlines with spaces, normalize whitespace
  const cleanText = text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  if (!cleanText) return [""];

  const originalWords = cleanText.split(" ").filter((word) => word.trim());
  const lines = [];
  let currentLine = "";

  for (const word of originalWords) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (testLine.length <= maxCharacters) {
      currentLine = testLine;
    } else {
      // Current line is full, save it and start a new line
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;

      // Handle extremely long words
      if (word.length > maxCharacters) {
        console.warn(
          `Word "${word}" exceeds maxCharacters (${maxCharacters}), keeping intact`
        );
      }
    }
  }

  // Don't forget the last line
  if (currentLine) {
    lines.push(currentLine);
  }

  // Verify all words are preserved
  const resultWords = lines
    .join(" ")
    .split(" ")
    .filter((word) => word.trim());
  if (originalWords.length !== resultWords.length) {
    console.error("WORD LOSS DETECTED!", {
      original: originalWords,
      result: resultWords,
      originalCount: originalWords.length,
      resultCount: resultWords.length,
      lost: originalWords.filter((w) => !resultWords.includes(w))
    });
    // Fallback: return original text as single line to preserve content
    return [cleanText];
  }

  // Double check each word is preserved
  for (let i = 0; i < originalWords.length; i++) {
    if (originalWords[i] !== resultWords[i]) {
      console.error("WORD ORDER CHANGED!", {
        originalWord: originalWords[i],
        resultWord: resultWords[i],
        index: i
      });
      // Fallback: return original text as single line
      return [cleanText];
    }
  }

  return lines.length > 0 ? lines : [""];
}

// Function to process summaries with optional limit and max strings
export function processSummaries(
  situations,
  maxCharacters = null,
  maxStrings = null
) {
  // Process summaries in smaller batches to reduce memory pressure
  const batchSize = 5; // Reduced batch size for better memory management
  const allScreens = [];
  let processedSummaries = 0;

  for (let i = 0; i < situations.length; i += batchSize) {
    if (maxStrings && processedSummaries >= maxStrings) {
      break;
    }

    const batch = situations.slice(i, i + batchSize);

    // Process each item individually to avoid accumulating intermediate arrays
    for (let j = 0; j < batch.length; j++) {
      if (maxStrings && processedSummaries >= maxStrings) {
        break;
      }

      const situation = batch[j];
      const summary = formatSummaryWithDates(situation);

      if (!summary) continue;

      if (!maxCharacters) {
        // No character limit, return summaries as single-line screens
        allScreens.push([summary, "", "", ""]);
        processedSummaries++;
      } else {
        // Convert summary into screen objects
        const summaryScreens = createScreensForSummary(summary, maxCharacters);
        allScreens.push(...summaryScreens);
        processedSummaries++;

        // Clear screen references immediately after use
        summaryScreens.length = 0;
      }

      // Nullify processed situation to help GC
      batch[j] = null;
    }

    // Clear batch completely
    batch.length = 0;

    // Force garbage collection hint every few batches if available
    if (
      i % (batchSize * 4) === 0 &&
      global.gc &&
      process.env.NODE_ENV !== "production"
    ) {
      global.gc();
    }
  }

  return allScreens;
}

// Revolutionary approach: Reserve space for decorative elements UPFRONT, never truncate content
function createScreensForSummary(summary, maxCharacters) {
  if (!summary || !maxCharacters) return [["", "", "", ""]];

  // Get all words from the summary - avoid creating intermediate arrays
  const cleanText = summary.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  const allWords = cleanText.split(" ").filter((word) => word.trim());

  if (allWords.length === 0) return [["", "", "", ""]];

  // PHASE 1: Build screens with conservative space allocation (assume we'll need ellipsis/counters)
  const screens = [];
  let wordIndex = 0;

  // Reserve space for the maximum possible decorative elements
  const maxCounterLength = 7; // " (99/99)" - generous estimate
  const ellipsisLength = 3; // "..."

  while (wordIndex < allWords.length) {
    const screen = ["", "", "", ""];
    const screenIndex = screens.length;
    const isFirstScreen = screenIndex === 0;

    // Fill lines in this screen with reserved space
    for (
      let lineIndex = 0;
      lineIndex < 4 && wordIndex < allWords.length;
      lineIndex++
    ) {
      let availableSpace = maxCharacters;
      let currentLine = "";

      // Reserve space for leading ellipsis on first line of continuation screens
      if (lineIndex === 0 && !isFirstScreen) {
        availableSpace -= ellipsisLength;
        currentLine = "...";
      }

      // Reserve space for counter on the last line (we don't know which line will be last yet)
      // So we reserve on all lines to be safe, but only apply on the actual last line later
      const isLastLine = lineIndex === 3;
      if (isLastLine) {
        availableSpace -= maxCounterLength;
        // Also reserve for trailing ellipsis if this might not be the final screen
        availableSpace -= ellipsisLength;
      }

      // Fill remaining space with words - minimize string concatenations
      let isFirstWordOnLine = currentLine === "" || currentLine === "...";
      const lineWords = [];

      while (wordIndex < allWords.length) {
        const word = allWords[wordIndex];
        const separator = isFirstWordOnLine ? "" : " ";
        const testLength = currentLine.length + separator.length + word.length;

        if (testLength <= availableSpace) {
          lineWords.push(word);
          wordIndex++;
          isFirstWordOnLine = false;
        } else {
          break; // Word doesn't fit in available space
        }
      }

      // Build final line only once
      if (lineWords.length > 0) {
        if (currentLine === "...") {
          currentLine = "..." + lineWords.join(" ");
        } else {
          currentLine = lineWords.join(" ");
        }
      }

      screen[lineIndex] = currentLine.trim();

      // Clear temporary array immediately
      lineWords.length = 0;

      // If we've used all words, break
      if (wordIndex >= allWords.length) break;
    }

    screens.push(screen);
  }

  // PHASE 2: Add decorative elements only where they fit without displacing content
  if (screens.length > 1) {
    for (let screenIndex = 0; screenIndex < screens.length; screenIndex++) {
      const screen = screens[screenIndex];
      const counter = `(${screenIndex + 1}/${screens.length})`;

      // Find the last non-empty line
      let lastNonEmptyIndex = 3;
      while (lastNonEmptyIndex >= 0 && !screen[lastNonEmptyIndex].trim()) {
        lastNonEmptyIndex--;
      }

      if (lastNonEmptyIndex >= 0) {
        const originalLine = screen[lastNonEmptyIndex];
        const isNotLastScreen = screenIndex < screens.length - 1;

        // Try to add decorative elements only if they fit
        let finalLine = originalLine.trim();

        // Add trailing ellipsis if not the last screen
        if (isNotLastScreen) {
          const withEllipsis = `${finalLine}...`;
          if (withEllipsis.length <= maxCharacters - counter.length - 1) {
            finalLine = withEllipsis;
          }
        }

        // Add counter
        const withCounter = `${finalLine} ${counter}`;
        if (withCounter.length <= maxCharacters) {
          screen[lastNonEmptyIndex] = withCounter;
        } else if (lastNonEmptyIndex < 3) {
          // Put counter on next line if available
          screen[lastNonEmptyIndex + 1] = counter;
          screen[lastNonEmptyIndex] = finalLine;
        } else {
          // Can't fit counter - just keep original content
          screen[lastNonEmptyIndex] = finalLine;
        }
      } else {
        // Empty screen, just put counter
        screen[0] = counter;
      }
    }
  }

  // VERIFICATION: Ensure all words are preserved (lightweight check)
  if (process.env.NODE_ENV === "development") {
    // Only perform expensive verification in development
    let wordCount = 0;
    for (const screen of screens) {
      for (const line of screen) {
        const cleanLine = line
          .replace(/\.\.\./g, "") // Remove ellipsis
          .replace(/\(\d+\/\d+\)/g, "") // Remove counters
          .trim();
        if (cleanLine) {
          wordCount += cleanLine
            .split(" ")
            .filter((word) => word.trim()).length;
        }
      }
    }

    if (allWords.length !== wordCount) {
      console.error(
        "WORD COUNT MISMATCH! Expected:",
        allWords.length,
        "Got:",
        wordCount
      );
    }
  }

  return screens;
}

// Helper function to get summaries from data
export function getSummariesFromData(
  data,
  maxCharacters,
  maxStrings = 50,
  maxDuration = null,
  routes = "Q"
) {
  const situations = extractSituations(data);
  const todaysSituations = processTodaysSituations(
    situations,
    maxDuration,
    routes
  );
  const result = processSummaries(todaysSituations, maxCharacters, maxStrings);

  // Force garbage collection after processing if available
  if (global.gc && process.env.NODE_ENV !== "production") {
    global.gc();
  }

  return result;
}

// Function to get LCD-formatted summaries from data
export function getLCDSummariesFromData(
  data,
  maxCharacters = null,
  maxStrings = 50,
  maxDuration = null,
  routes = "Q"
) {
  const situations = extractSituations(data);
  const todaysSituations = processTodaysSituations(
    situations,
    maxDuration,
    routes
  );

  // Use the new screen-based summaries logic
  const result = processSummaries(todaysSituations, maxCharacters, maxStrings);

  // Force garbage collection after processing if available
  if (global.gc && process.env.NODE_ENV !== "production") {
    global.gc();
  }

  return result;
}

// Function to process and format the API data for full alerts response
export function formatAlertsResponse(
  data,
  cacheAge = null,
  maxDuration = null,
  routes = "Q"
) {
  try {
    const situations = extractSituations(data);
    const todaysSituations = processTodaysSituations(
      situations,
      maxDuration,
      routes
    );

    // Pre-calculate values to avoid repeated computation
    const now = Date.now();
    const fetchedAtISO = new Date().toISOString();
    const cachedAtISO = cacheAge ? new Date(cacheAge).toISOString() : null;
    const cacheAgeMinutes = cacheAge
      ? Math.floor((now - cacheAge) / 1000 / 60)
      : null;
    const maxDurationFilterText = maxDuration ? `${maxDuration} days` : null;

    // Process alerts efficiently to minimize object creation
    const alerts = todaysSituations.map((situation) => {
      // Pre-extract frequently accessed nested properties
      const publicationWindow = situation.PublicationWindow;
      const affects = situation.Affects;
      const vehicleJourneys = affects?.VehicleJourneys?.AffectedVehicleJourney;

      // Process affected routes efficiently
      let affectedRoutes = [];
      if (vehicleJourneys && vehicleJourneys.length) {
        const routeSet = new Set();
        for (const journey of vehicleJourneys) {
          const lineRef = journey.LineRef;
          if (lineRef) {
            const cleanRoute = lineRef.replace(/^(MTA NYCT_|MTABC_)/, "");
            if (cleanRoute) {
              routeSet.add(cleanRoute);
            }
          }
        }
        affectedRoutes = Array.from(routeSet);
      }

      return {
        summary: situation.Summary,
        description: situation.Description,
        effectiveStart: publicationWindow?.StartTime,
        effectiveEnd: publicationWindow?.EndTime,
        affectedRoutes,
        createdAt: situation.CreationTime
      };
    });

    // Format the response
    return {
      fetchedAt: fetchedAtISO,
      cachedAt: cachedAtISO,
      cacheAge: cacheAgeMinutes,
      totalSituations: situations.length,
      situationsForToday: todaysSituations.length,
      maxDurationFilter: maxDurationFilterText,
      alerts
    };
  } catch (error) {
    throw error;
  }
}
