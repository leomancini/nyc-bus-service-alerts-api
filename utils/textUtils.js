// Function to split long summaries into parts
export function splitSummary(summary, maxLength) {
  if (!summary || !maxLength) {
    return [summary];
  }

  // Account for potential part indicator: "... (1/2)" = ~8 chars, be safe with 12
  const partIndicatorSpace = 12;

  // If summary fits even with potential part indicator, no splitting needed
  if (summary.length <= maxLength - partIndicatorSpace) {
    return [summary];
  }

  const parts = [];
  let currentText = summary;
  let partNumber = 1;

  while (currentText.length > 0) {
    let splitAt = maxLength;

    if (currentText.length > maxLength) {
      // Leave space for ellipsis and part indicator: "... (1/2)" = ~10 chars
      const spaceNeeded = partNumber === 1 ? 10 : 14; // More space for continuation ellipsis
      const lastSpace = currentText.lastIndexOf(" ", maxLength - spaceNeeded);
      if (lastSpace > maxLength * 0.5) {
        // Don't split too early
        splitAt = lastSpace;
      } else {
        splitAt = maxLength - spaceNeeded;
      }
    }

    let chunk = currentText.substring(0, splitAt).trim();
    const remainingText = currentText.substring(splitAt).trim();

    // Calculate total parts needed (rough estimate)
    const estimatedTotalParts = Math.ceil(summary.length / (maxLength - 14));

    if (remainingText.length > 0) {
      // Not the last part - add ellipsis before part indicator
      if (partNumber === 1) {
        // First part - only add ellipsis at end if not already ending with punctuation
        const endEllipsis = /[.!?…]$/.test(chunk.trim()) ? "" : "...";
        chunk = `${chunk}${endEllipsis} (${partNumber}/${estimatedTotalParts})`;
      } else {
        // Middle parts - ellipsis at start and end
        const endEllipsis = /[.!?…]$/.test(chunk.trim()) ? "" : "...";
        chunk = `...${chunk}${endEllipsis} (${partNumber}/${estimatedTotalParts})`;
      }
    } else {
      // Last part - add ellipsis at beginning if it's a continuation
      if (partNumber > 1) {
        chunk = `...${chunk} (${partNumber}/${estimatedTotalParts})`;
      }
    }

    parts.push(chunk);
    currentText = remainingText;
    partNumber++;
  }

  // Update with actual total parts
  const actualTotalParts = parts.length;
  if (actualTotalParts > 1) {
    return parts.map((part, index) => {
      // Update the part numbers to reflect actual total
      return part.replace(/\(\d+\/\d+\)/, `(${index + 1}/${actualTotalParts})`);
    });
  }

  return parts;
}
