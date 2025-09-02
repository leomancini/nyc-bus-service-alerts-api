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

      // If the word itself is longer than maxLength, put it on its own line anyway
      // Don't break the word - let it be handled at display time
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

// Helper function to safely truncate a line to maxLength, preferring word boundaries
function truncateToLength(line, maxLength) {
  if (!line || line.length <= maxLength) return line;

  // Try to find a good break point at a word boundary
  const lastSpace = line.lastIndexOf(" ", maxLength);
  if (lastSpace > maxLength * 0.6) {
    // Don't truncate too early (keep at least 60% of chars)
    return line.substring(0, lastSpace).trim();
  }

  // If no good word boundary, just truncate
  return line.slice(0, maxLength).trim();
}

// Function to format a single situation for 20x4 LCD display, returning multiple screens if needed
function formatSituationForLCD(situation) {
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
  const allLines = wrapText(description, 20);

  // Create first screen
  const firstScreen = ["", "", "", ""];

  // Ensure date line fits in 20 characters without breaking words
  firstScreen[0] = truncateToLength(dateLine, 20);

  // Try to fit some description on first line if there's space
  const remainingSpaceOnLine0 = 20 - firstScreen[0].length;
  let remainingLines = [...allLines];

  if (remainingSpaceOnLine0 > 3 && firstScreen[0].trim() && remainingLines[0]) {
    const testLine = `${firstScreen[0]} ${remainingLines[0]}`.trim();
    if (testLine.length <= 20) {
      firstScreen[0] = testLine;
      remainingLines.shift();
    }
    // If it doesn't fit, just leave it for the next line - don't try to partially fit
  }

  // Fill rest of first screen
  for (let i = 1; i < 4 && remainingLines.length > 0; i++) {
    firstScreen[i] = truncateToLength(remainingLines.shift() || "", 20);
  }

  screens.push(firstScreen.map((line) => line.trim()));

  // Create additional screens if needed
  while (remainingLines.length > 0) {
    const screen = ["", "", "", ""];

    // Fill the continuation screen
    for (let i = 0; i < 4 && remainingLines.length > 0; i++) {
      screen[i] = truncateToLength(remainingLines.shift() || "", 20);
    }

    screens.push(screen.map((line) => line.trim()));
  }

  // Add screen counters if there are multiple screens
  if (screens.length > 1) {
    for (let screenIndex = 0; screenIndex < screens.length; screenIndex++) {
      const counter = `(${screenIndex + 1}/${screens.length})`;
      const screen = screens[screenIndex];

      // Find the last non-empty line to add the counter
      let lastLineIndex = 3;
      while (lastLineIndex >= 0 && !screen[lastLineIndex].trim()) {
        lastLineIndex--;
      }

      if (lastLineIndex >= 0) {
        const currentLine = screen[lastLineIndex];
        const newLine = `${currentLine} ${counter}`;

        if (newLine.length <= 20) {
          screen[lastLineIndex] = newLine;
        } else {
          // Try to fit counter on current line by truncating
          const maxContentLength = 20 - counter.length - 1; // -1 for space
          if (maxContentLength > 5) {
            // Only if we have reasonable space
            const truncated = truncateToLength(currentLine, maxContentLength);
            const remainingText = currentLine
              .substring(truncated.length)
              .trim();

            // If there's remaining text and this is the last screen, try to preserve it
            if (remainingText && screenIndex === screens.length - 1) {
              // This is the final screen - prioritize keeping words together
              // First, try to put the counter on a new line to keep the full text
              if (lastLineIndex < 3 && !screen[lastLineIndex + 1].trim()) {
                // Put counter on next line, keep original line intact
                screen[lastLineIndex + 1] = counter;
                // Don't modify the current line - keep "stops are missed" together
              } else {
                // No empty line available, try to fit remaining text on a new line
                let foundEmptyLine = false;
                for (let lineIdx = lastLineIndex + 1; lineIdx < 4; lineIdx++) {
                  if (!screen[lineIdx].trim()) {
                    screen[lineIdx] = truncateToLength(remainingText, 20);
                    foundEmptyLine = true;
                    break;
                  }
                }

                if (foundEmptyLine) {
                  // Successfully placed remaining text, now add counter
                  screen[lastLineIndex] = `${truncated} ${counter}`;
                } else {
                  // Really last resort - truncate but keep as much as possible
                  screen[lastLineIndex] = `${truncated} ${counter}`;
                }
              }
            } else {
              screen[lastLineIndex] = `${truncated} ${counter}`;

              // If there's remaining text and a next screen, prepend it to the next screen
              if (remainingText && screenIndex < screens.length - 1) {
                const nextScreen = screens[screenIndex + 1];
                // Find first non-empty line in next screen to prepend the remaining text
                let firstNonEmptyIndex = 0;
                while (
                  firstNonEmptyIndex < 4 &&
                  !nextScreen[firstNonEmptyIndex].trim()
                ) {
                  firstNonEmptyIndex++;
                }

                if (firstNonEmptyIndex < 4) {
                  // Combine remaining text with first line of next screen
                  const combinedLine =
                    `${remainingText} ${nextScreen[firstNonEmptyIndex]}`.trim();
                  const wrappedCombined = wrapText(combinedLine, 20);

                  // Replace the first line and potentially add more lines
                  nextScreen[firstNonEmptyIndex] = wrappedCombined[0] || "";

                  // If wrapping created multiple lines, try to fit them
                  for (
                    let j = 1;
                    j < wrappedCombined.length && firstNonEmptyIndex + j < 4;
                    j++
                  ) {
                    // Shift existing content down if possible
                    if (!nextScreen[firstNonEmptyIndex + j].trim()) {
                      nextScreen[firstNonEmptyIndex + j] = wrappedCombined[j];
                    } else {
                      // If we can't fit it cleanly, just take the first wrapped line
                      break;
                    }
                  }
                }
              }
            }
          } else if (lastLineIndex < 3) {
            // Move to next line if possible
            screen[lastLineIndex + 1] = counter;
          } else {
            // Force fit on current line
            screen[lastLineIndex] = truncateToLength(
              `${currentLine} ${counter}`,
              20
            );
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
  maxAlerts = 10,
  maxDuration = null
) {
  const situations = extractSituations(data);
  const todaysSituations = processTodaysSituations(situations, maxDuration);

  // Format each situation and flatten the screens
  const allScreens = [];
  for (let i = 0; i < Math.min(todaysSituations.length, maxAlerts); i++) {
    const situationScreens = formatSituationForLCD(todaysSituations[i]);
    allScreens.push(...situationScreens);
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
