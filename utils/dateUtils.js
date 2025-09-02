// Function to check if a situation starts today
export function startsToday(situation) {
  const today = new Date();
  const todayDateString = today.toISOString().split("T")[0];

  const publicationWindow = situation.PublicationWindow;
  if (!publicationWindow || !publicationWindow.StartTime) return false;

  try {
    const startTime = new Date(publicationWindow.StartTime);
    if (isNaN(startTime.getTime())) return false;

    const startDateString = startTime.toISOString().split("T")[0];
    return todayDateString === startDateString;
  } catch {
    return false;
  }
}

// Function to check if a situation was created today
export function createdToday(situation) {
  if (!situation.CreationTime) return false;

  const today = new Date();
  const todayDateString = today.toISOString().split("T")[0];

  try {
    const creationTime = new Date(situation.CreationTime);
    if (isNaN(creationTime.getTime())) return false;

    const creationDateString = creationTime.toISOString().split("T")[0];
    return todayDateString === creationDateString;
  } catch {
    return false;
  }
}

// Function to check if a situation is relevant for today (active within date range)
export function isRelevantForToday(situation) {
  const today = new Date();
  const todayDateString = today.toISOString().split("T")[0]; // Get YYYY-MM-DD format

  const publicationWindow = situation.PublicationWindow;
  if (!publicationWindow) return false;

  try {
    // Handle missing start/end times
    const startTimeStr = publicationWindow.StartTime;
    const endTimeStr = publicationWindow.EndTime;

    // If no start time, skip this situation
    if (!startTimeStr) {
      return false;
    }

    const startTime = new Date(startTimeStr);

    // Check if start time is valid
    if (isNaN(startTime.getTime())) {
      return false;
    }

    const startDateString = startTime.toISOString().split("T")[0]; // YYYY-MM-DD

    // If no end time, treat as ongoing (active from start date onwards)
    if (!endTimeStr) {
      return todayDateString >= startDateString;
    }

    const endTime = new Date(endTimeStr);

    // Check if end time is valid
    if (isNaN(endTime.getTime())) {
      // If end time is invalid but start time is valid, treat as ongoing
      return todayDateString >= startDateString;
    }

    const endDateString = endTime.toISOString().split("T")[0]; // YYYY-MM-DD

    // Check if today's date falls within the publication window (date-only comparison)
    return (
      todayDateString >= startDateString && todayDateString <= endDateString
    );
  } catch (error) {
    return false;
  }
}

// Function to calculate duration in days between start and end dates
export function calculateDurationInDays(startTimeStr, endTimeStr) {
  if (!startTimeStr || !endTimeStr) {
    return null; // Cannot calculate duration without both dates
  }

  try {
    const startTime = new Date(startTimeStr);
    const endTime = new Date(endTimeStr);

    // Check if dates are valid
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return null;
    }

    // Calculate difference in milliseconds, then convert to days
    const diffInMs = endTime.getTime() - startTime.getTime();
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

    return diffInDays;
  } catch (error) {
    return null;
  }
}

// Function to check if a situation's duration is within the specified limit
export function isWithinDurationLimit(situation, maxDurationDays) {
  if (!maxDurationDays) {
    return true; // No limit specified, include all situations
  }

  const publicationWindow = situation.PublicationWindow;
  if (!publicationWindow) {
    return true; // No publication window, include by default
  }

  const startTimeStr = publicationWindow.StartTime;
  const endTimeStr = publicationWindow.EndTime;

  // If there's no end time (ongoing alert), include it
  if (!endTimeStr) {
    return true;
  }

  const duration = calculateDurationInDays(startTimeStr, endTimeStr);

  // If we can't calculate duration, include it by default
  if (duration === null) {
    return true;
  }

  return duration <= maxDurationDays;
}
