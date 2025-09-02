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
