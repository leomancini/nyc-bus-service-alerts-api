import { isRelevantForToday, isWithinDurationLimit } from "./dateUtils.js";
import { splitSummary } from "./textUtils.js";

// Function to extract and process situations from API data
export function extractSituations(data) {
  return (
    data?.Siri?.ServiceDelivery?.SituationExchangeDelivery?.[0]?.Situations
      ?.PtSituationElement || []
  );
}

// Function to filter and sort situations for today
export function processTodaysSituations(situations, maxDuration = null) {
  const todaysSituations = situations.filter((situation) => {
    return (
      isRelevantForToday(situation) &&
      isWithinDurationLimit(situation, maxDuration)
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

// Function to process summaries with optional limit and max strings
export function processSummaries(
  situations,
  maxCharacters = null,
  maxStrings = null
) {
  let summaries = situations.map(formatSummaryWithDates).filter(Boolean);

  // Apply character limit if specified (this creates grouped parts per summary)
  if (maxCharacters) {
    const summaryGroups = summaries.map((summary) =>
      splitSummary(summary, maxCharacters)
    );

    // Smart limiting: never truncate in middle of a multi-part summary
    if (maxStrings) {
      const result = [];
      let currentLineCount = 0;

      for (const group of summaryGroups) {
        // Check if adding this entire group would exceed maxStrings
        if (currentLineCount + group.length <= maxStrings) {
          result.push(...group);
          currentLineCount += group.length;
        } else {
          // Would exceed limit, so stop here (don't add partial group)
          break;
        }
      }

      return result;
    } else {
      // No string limit, just flatten all groups
      return summaryGroups.flat();
    }
  }

  // No character limit, just apply string limit if specified
  if (maxStrings) {
    summaries = summaries.slice(0, maxStrings);
  }

  return summaries;
}

// Helper function to get summaries from data
export function getSummariesFromData(
  data,
  maxCharacters,
  maxStrings = 50,
  maxDuration = null
) {
  const situations = extractSituations(data);
  const todaysSituations = processTodaysSituations(situations, maxDuration);
  return processSummaries(todaysSituations, maxCharacters, maxStrings);
}

// Helper function to format time as "6:23pm"
function formatTimeShort(date) {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";

  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'

  const minutesStr = minutes < 10 ? `0${minutes}` : minutes;

  return `${hours}:${minutesStr}${ampm}`;
}

// Helper function to wrap text intelligently to fit within character limits without breaking words
function wrapText(text, maxLength) {
  if (!text || text.length <= maxLength) return [text || ""];

  // Replace any newlines with spaces to ensure clean text processing
  text = text.replace(/\n/g, " ");

  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    // Check if adding this word would exceed the limit
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (testLine.length <= maxLength) {
      currentLine = testLine;
    } else {
      // Current line is full, start a new line
      if (currentLine) {
        lines.push(currentLine);
      }

      // If the word itself is longer than maxLength, we have a problem
      // This shouldn't happen with normal text, but if it does, we need to handle it
      if (word.length > maxLength) {
        console.warn("Word exceeds maxLength:", word, "maxLength:", maxLength);
        // For now, just put it on its own line and let it be handled later
        currentLine = word;
      } else {
        // Start a new line with this word
        currentLine = word;
      }
    }
  }

  if (currentLine) lines.push(currentLine);

  // Verify that all original words are preserved
  const originalWords = text.split(" ").filter((w) => w.trim());
  const wrappedWords = lines
    .join(" ")
    .split(" ")
    .filter((w) => w.trim());

  // If we lost any words, this is a critical error - we should never lose content
  if (originalWords.length !== wrappedWords.length) {
    console.error("CRITICAL ERROR: Text wrapping lost words:", {
      original: originalWords,
      wrapped: wrappedWords,
      originalText: text,
      wrappedText: lines.join(" ")
    });
    // As a fallback, return the original text as a single line
    return [text];
  }

  // Verify that no line exceeds maxLength
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > maxLength) {
      console.error("CRITICAL ERROR: Line exceeds maxLength:", {
        line: lines[i],
        length: lines[i].length,
        maxLength: maxLength,
        lineIndex: i
      });
    }
  }

  return lines;
}

// Helper function to safely truncate a line to maxLength, preferring word boundaries
function truncateToLength(line, maxLength) {
  if (!line || line.length <= maxLength) return line;

  // Try to find a good break point at a word boundary
  const lastSpace = line.lastIndexOf(" ", maxLength);
  if (lastSpace > maxLength * 0.7) {
    // Don't truncate too early (keep at least 70% of chars instead of 60%)
    return line.substring(0, lastSpace).trim();
  }

  // If no good word boundary, just truncate
  return line.slice(0, maxLength).trim();
}

// Helper to rebuild a continuation screen by prepending remainder and re-wrapping
function rebuildContinuationScreen(nextScreenLines, prefixText, maxCharacters) {
  const normalizedLines = (nextScreenLines || []).map((l) => (l || "").trim());
  const existingJoined = normalizedLines
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ");
  const combined = [prefixText, existingJoined]
    .filter(Boolean)
    .join(" ")
    .trim();

  // Wrap full combined text; reserve 3 chars for leading ellipsis on first line
  const wrapped = wrapText(combined, maxCharacters);
  const result = ["", "", "", ""];

  if (wrapped.length > 0) {
    const firstCore = wrapped[0] || "";
    const firstWithEllipsis = `...${firstCore}`;
    result[0] =
      firstWithEllipsis.length <= maxCharacters
        ? firstWithEllipsis
        : `...${truncateToLength(firstCore, maxCharacters - 3)}`;
  }

  for (let i = 1; i < 4; i++) {
    result[i] = wrapped[i] ? truncateToLength(wrapped[i], maxCharacters) : "";
  }

  return result;
}

// Function to format a single situation for 20x4 LCD display, returning multiple screens if needed
function formatSituationForLCD(situation, maxCharacters = 20) {
  const screens = [];

  // Extract basic info
  let summary = situation.Summary || "";
  summary = summary.replace(/\.$/, ""); // Remove trailing period
  summary = summary.replace(/\n/g, " "); // Replace newlines with spaces

  // Get affected routes
  const affectedRoutes = [
    ...new Set(
      situation.Affects?.VehicleJourneys?.AffectedVehicleJourney?.map(
        (journey) => journey.LineRef?.replace(/^(MTA NYCT_|MTABC_)/, "") || ""
      ).filter(Boolean) || []
    )
  ];

  // Format dates
  const startDateObj = situation.PublicationWindow?.StartTime
    ? new Date(situation.PublicationWindow.StartTime)
    : null;
  const endDateObj = situation.PublicationWindow?.EndTime
    ? new Date(situation.PublicationWindow.EndTime)
    : null;

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

  let dateLine = "";

  // Format date line
  if (startDateObj && endDateObj) {
    const startMonth = startDateObj.getMonth();
    const startDay = startDateObj.getDate();
    const startYear = startDateObj.getFullYear();
    const endMonth = endDateObj.getMonth();
    const endDay = endDateObj.getDate();
    const endYear = endDateObj.getFullYear();

    if (
      startMonth === endMonth &&
      startDay === endDay &&
      startYear === endYear
    ) {
      dateLine = `${monthNames[startMonth]} ${startDay}, ${startYear}:`;
    } else if (startYear === endYear) {
      if (startMonth === endMonth) {
        dateLine = `${monthNames[startMonth]} ${startDay}-${endDay}, ${startYear}:`;
      } else {
        dateLine = `${monthNames[startMonth]} ${startDay}-${monthNames[endMonth]} ${endDay}, ${startYear}:`;
      }
    } else {
      dateLine = `${monthNames[startMonth]} ${startDay}, ${startYear}-${monthNames[endMonth]} ${endDay}, ${endYear}:`;
    }
  } else if (startDateObj) {
    const startMonth = startDateObj.getMonth();
    const startDay = startDateObj.getDate();
    const startTime = formatTimeShort(startDateObj);
    dateLine = `${monthNames[startMonth]} ${startDay}, ${startTime} - now:`;
  }

  // If date line is too long, truncate intelligently
  if (dateLine.length > 20) {
    // Try shorter format
    if (startDateObj && endDateObj) {
      const startMonth = startDateObj.getMonth();
      const startDay = startDateObj.getDate();
      const endDay = endDateObj.getDate();
      dateLine = `${monthNames[startMonth]} ${startDay}-${endDay}:`;
    } else if (startDateObj) {
      const startMonth = startDateObj.getMonth();
      const startDay = startDateObj.getDate();
      const startTime = formatTimeShort(startDateObj);
      dateLine = `${monthNames[startMonth]} ${startDay}, ${startTime}-now:`;
    }
  }

  // Create description, being smart about route duplication
  let description = summary;
  if (affectedRoutes.length > 0) {
    const routeText = affectedRoutes.slice(0, 3).join(", ");

    // Check if routes are already mentioned in the summary
    const summaryLower = summary.toLowerCase();
    const routesAlreadyMentioned = affectedRoutes.some((route) =>
      summaryLower.includes(route.toLowerCase())
    );

    // Only prepend route info if not already in summary
    if (!routesAlreadyMentioned) {
      description = `${routeText} ${description}`;
    }
  }

  // Wrap description into lines
  const allLines = wrapText(description, maxCharacters);
  // Create first screen
  const firstScreen = ["", "", "", ""];

  // Ensure date line fits in maxCharacters without breaking words
  firstScreen[0] = truncateToLength(dateLine, maxCharacters);

  // Try to fit some description on first line if there's space
  const remainingSpaceOnLine0 = maxCharacters - firstScreen[0].length;
  let remainingLines = [...allLines];

  if (remainingSpaceOnLine0 > 3 && firstScreen[0].trim() && remainingLines[0]) {
    const testLine = `${firstScreen[0]} ${remainingLines[0]}`.trim();
    if (testLine.length <= maxCharacters) {
      firstScreen[0] = testLine;
      remainingLines.shift();
    }
    // If it doesn't fit, just leave it for the next line - don't try to partially fit
  }

  // Fill rest of first screen
  for (let i = 1; i < 4 && remainingLines.length > 0; i++) {
    firstScreen[i] = remainingLines.shift() || "";
  }

  screens.push(firstScreen.map((line) => line.trim()));

  // Create additional screens if needed
  while (remainingLines.length > 0) {
    const screen = ["", "", "", ""];

    // Fill the continuation screen
    for (let i = 0; i < 4 && remainingLines.length > 0; i++) {
      screen[i] = remainingLines.shift() || "";
    }

    screens.push(screen.map((line) => line.trim()));
  }

  // Add ellipsis to first line of continuation screens and counters to all screens
  if (screens.length > 1) {
    // Track which screens have been updated by text movement to avoid double-processing
    const updatedByTextMovement = new Array(screens.length).fill(false);

    for (let screenIndex = 0; screenIndex < screens.length; screenIndex++) {
      const isFirstScreen = screenIndex === 0;
      const isLastScreen = screenIndex === screens.length - 1;
      const counter = `(${screenIndex + 1}/${screens.length})`;
      const screen = screens[screenIndex];

      // Add ellipsis to first non-empty line of continuation screens
      // Only if this screen hasn't been updated by text movement
      if (!isFirstScreen && !updatedByTextMovement[screenIndex]) {
        for (let lineIndex = 0; lineIndex < 4; lineIndex++) {
          if (screen[lineIndex].trim()) {
            // Add ellipsis to beginning of first non-empty line
            const originalLine = screen[lineIndex];
            const lineWithEllipsis = `...${originalLine}`;

            if (lineWithEllipsis.length <= maxCharacters) {
              screen[lineIndex] = lineWithEllipsis;
            } else {
              // Check if truncating would lose too much text
              const maxLineLength = maxCharacters - 3; // Account for "..."
              if (maxLineLength >= originalLine.length - 1) {
                // Only truncate if we lose at most 1 character
                const truncatedLine = truncateToLength(
                  originalLine,
                  maxLineLength
                );
                screen[lineIndex] = `...${truncatedLine}`;
              } else {
                // Would lose too much text, skip ellipsis to preserve content
                screen[lineIndex] = originalLine;
              }
            }
            break; // Only modify the first non-empty line
          }
        }
      }

      // Find the last non-empty line to add the counter
      let lastLineIndex = 3;
      while (lastLineIndex >= 0 && !screen[lastLineIndex].trim()) {
        lastLineIndex--;
      }

      if (lastLineIndex >= 0) {
        const currentLine = screen[lastLineIndex];

        // For non-final screens, trim trailing spaces before adding ellipsis
        let lineToProcess = currentLine;
        if (!isLastScreen) {
          lineToProcess = currentLine.trim();
        }

        // Double-check: ensure no trailing spaces before adding counter
        lineToProcess = lineToProcess.trim();

        // For non-final screens, add ellipsis to the text before the counter
        const textWithEllipsis = isLastScreen
          ? lineToProcess
          : `${lineToProcess}...`;
        const newLine = `${textWithEllipsis} ${counter}`;

        if (newLine.length <= maxCharacters) {
          screen[lastLineIndex] = newLine;
        } else {
          // ALWAYS try to put counter on next line first to avoid losing words
          if (lastLineIndex < 3) {
            // Put counter on next line, keep original line intact
            screen[lastLineIndex + 1] = counter;
            // Keep the original line with ellipsis if needed
            screen[lastLineIndex] = textWithEllipsis.length <= maxCharacters ? textWithEllipsis : lineToProcess;
          } else {
            // Last line, no choice but to fit on same line - but try to minimize truncation
            const maxContentLength = maxCharacters - counter.length - 1; // -1 for space
            if (maxContentLength >= lineToProcess.length - 1) {
              // Only truncate if we lose at most 1 character
              const truncated = truncateToLength(
                lineToProcess,
                maxContentLength
              );
              screen[lastLineIndex] = `${truncated} ${counter}`;
            } else {
              // Would lose too much text, just put counter on its own and keep text intact
              screen[lastLineIndex] = lineToProcess;
              // Add counter info to first line of screen if possible
              if (screen[0].length + counter.length + 1 <= maxCharacters) {
                screen[0] = `${screen[0]} ${counter}`;
              }
            }
          }
        }
      } else {
        // All lines are empty, put counter on first line
        screen[0] = counter;
      }
    }
  }

  return screens;
}

// Function to get LCD-formatted summaries from data
export function getLCDSummariesFromData(
  data,
  maxCharacters = null,
  maxStrings = 50,
  maxDuration = null
) {
  const situations = extractSituations(data);
  const todaysSituations = processTodaysSituations(situations, maxDuration);

  // Format each situation and flatten the screens
  const allScreens = [];
  let summaryCount = 0;

  for (let i = 0; i < todaysSituations.length; i++) {
    // Check if adding this summary would exceed maxStrings
    if (maxStrings && summaryCount >= maxStrings) {
      break;
    }

    const situationScreens = formatSituationForLCD(
      todaysSituations[i],
      maxCharacters
    );

    allScreens.push(...situationScreens);
    summaryCount++; // Count each situation as 1 summary, regardless of how many screens it uses
  }

  return allScreens;
}

// Function to process and format the API data for full alerts response
export function formatAlertsResponse(
  data,
  cacheAge = null,
  maxDuration = null
) {
  try {
    const situations = extractSituations(data);
    const todaysSituations = processTodaysSituations(situations, maxDuration);

    // Format the response
    return {
      fetchedAt: new Date().toISOString(),
      cachedAt: cacheAge ? new Date(cacheAge).toISOString() : null,
      cacheAge: cacheAge
        ? Math.floor((Date.now() - cacheAge) / 1000 / 60)
        : null, // age in minutes
      totalSituations: situations.length,
      situationsForToday: todaysSituations.length,
      maxDurationFilter: maxDuration ? `${maxDuration} days` : null,
      alerts: todaysSituations.map((situation) => ({
        summary: situation.Summary,
        description: situation.Description,
        effectiveStart: situation.PublicationWindow?.StartTime,
        effectiveEnd: situation.PublicationWindow?.EndTime,
        affectedRoutes: [
          ...new Set(
            situation.Affects?.VehicleJourneys?.AffectedVehicleJourney?.map(
              (journey) =>
                journey.LineRef?.replace(/^(MTA NYCT_|MTABC_)/, "") || ""
            ).filter(Boolean) || []
          )
        ],
        createdAt: situation.CreationTime
      }))
    };
  } catch (error) {
    throw error;
  }
}
