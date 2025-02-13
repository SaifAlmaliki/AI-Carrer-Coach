/**
 * Helper Functions for Resume Generation
 *
 * This file contains utility functions used in the resume builder
 * to transform data into properly formatted markdown content.
 * Converts an array of entries (Experience, Education, or Projects) into markdown format
 */

export function entriesToMarkdown(entries, type) {
  // Return empty string if entries array is null/undefined or empty
  if (!entries?.length) return "";

  return (
    // Create section header with the type (e.g., "## Work Experience")
    `## ${type}\n\n` +
    entries
      .map((entry) => {
        // Format date range, showing "Present" for current positions
        const dateRange = entry.current
          ? `${entry.startDate} - Present`
          : `${entry.startDate} - ${entry.endDate}`;

        // Format each entry as:
        // ### Title @ Organization
        // Date Range
        // Description
        return `### ${entry.title} @ ${entry.organization}\n${dateRange}\n\n${entry.description}`;
      })
      // Join all entries with double newlines for proper markdown spacing
      .join("\n\n")
  );
}
