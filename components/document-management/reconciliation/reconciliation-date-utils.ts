// Utility functions for date conversion between display format and ISO format

/**
 * Converts date from display format (DD-MMM-YY) to ISO format (YYYY-MM-DD)
 * Handles various formats: "3-Oct-19", "12-Dec-19", "02-Jan-20", etc.
 */
export function displayDateToISO(displayDate: string | null): string {
  if (!displayDate || displayDate.trim() === "") return "";

  // Try to parse common formats
  const formats = [
    /^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/, // DD-MMM-YY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD (already ISO)
  ];

  for (const format of formats) {
    const match = displayDate.match(format);
    if (match) {
      if (format === formats[0]) {
        // DD-MMM-YY format
        const day = parseInt(match[1], 10);
        const monthName = match[2];
        const year = parseInt(match[3], 10);
        const fullYear = year < 50 ? 2000 + year : 1900 + year;

        const monthMap: Record<string, number> = {
          jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
          jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
        };

        const month = monthMap[monthName.toLowerCase()];
        if (month) {
          return `${fullYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        }
      } else if (format === formats[1]) {
        // MM/DD/YYYY format
        const month = parseInt(match[1], 10);
        const day = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      } else if (format === formats[2]) {
        // Already ISO format
        return displayDate;
      }
    }
  }

  // If no format matches, try to parse as Date
  const parsed = new Date(displayDate);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return "";
}

/**
 * Converts date from ISO format (YYYY-MM-DD) to display format (DD-MMM-YY)
 */
export function isoToDisplayDate(isoDate: string | null): string {
  if (!isoDate || isoDate.trim() === "") return "";

  try {
    const date = new Date(isoDate + "T00:00:00");
    if (isNaN(date.getTime())) return "";

    const day = date.getDate();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear() % 100;

    return `${day}-${month}-${String(year).padStart(2, "0")}`;
  } catch {
    return "";
  }
}
