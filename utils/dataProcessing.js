import { isRelevantForToday } from "./dateUtils.js";
import { splitSummary } from "./textUtils.js";

// Function to extract and process situations from API data
export function extractSituations(data) {
  return (
    data?.Siri?.ServiceDelivery?.SituationExchangeDelivery?.[0]?.Situations
      ?.PtSituationElement || []
  );
}

// Function to filter and sort situations for today
export function processTodaysSituations(situations) {
  const todaysSituations = situations.filter(isRelevantForToday);

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

// Function to format summary with effective dates
export function formatSummaryWithDates(situation) {
  let summary = situation.Summary;
  if (!summary) return null;

  // Strip trailing period from summary
  summary = summary.replace(/\.$/, "");

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
        // Same month and year: "Sep 1–2, 2025"
        const formattedDate = `${monthNames[startMonth]} ${startDay}–${endDay}, ${startYear}`;
        summary = `${formattedDate}: ${summary}`;
      } else {
        // Different months, same year: "Sep 23 – Oct 3, 2025"
        const formattedDate = `${monthNames[startMonth]} ${startDay} – ${monthNames[endMonth]} ${endDay}, ${startYear}`;
        summary = `${formattedDate}: ${summary}`;
      }
    } else {
      // Different years: "Dec 12, 2025 – Jan 3, 2026"
      const startFormatted = `${monthNames[startMonth]} ${startDay}, ${startYear}`;
      const endFormatted = `${monthNames[endMonth]} ${endDay}, ${endYear}`;
      summary = `${startFormatted} – ${endFormatted}: ${summary}`;
    }
  } else if (startDateObj) {
    const startMonth = startDateObj.getMonth();
    const startDay = startDateObj.getDate();
    const startYear = startDateObj.getFullYear();
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
    const formattedDate = `${monthNames[startMonth]} ${startDay}, ${startYear}`;
    summary = `${formattedDate} – ongoing: ${summary}`;
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
export function getSummariesFromData(data, maxCharacters, maxStrings = 50) {
  const situations = extractSituations(data);
  const todaysSituations = processTodaysSituations(situations);
  return processSummaries(todaysSituations, maxCharacters, maxStrings);
}

// Function to process and format the API data for full alerts response
export function formatAlertsResponse(data, cacheAge = null) {
  try {
    const situations = extractSituations(data);
    const todaysSituations = processTodaysSituations(situations);

    // Format the response
    return {
      fetchedAt: new Date().toISOString(),
      cachedAt: cacheAge ? new Date(cacheAge).toISOString() : null,
      cacheAge: cacheAge
        ? Math.floor((Date.now() - cacheAge) / 1000 / 60)
        : null, // age in minutes
      totalSituations: situations.length,
      situationsForToday: todaysSituations.length,
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
