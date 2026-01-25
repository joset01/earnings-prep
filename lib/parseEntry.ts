export interface ParsedEntry {
  ticker: string;
  date: string;
  note: string;
}

export function parseEntry(input: string): ParsedEntry | null {
  // Expected format: "WFC 10/30/2025: note here"
  // Regex: TICKER MM/DD/YYYY: note
  const regex = /^([A-Z]{1,5})\s+(\d{1,2}\/\d{1,2}\/\d{4}):\s*(.+)$/i;
  const match = input.trim().match(regex);

  if (!match) {
    return null;
  }

  const [, ticker, dateStr, note] = match;

  // Parse and validate date
  const [month, day, year] = dateStr.split("/").map(Number);
  const date = new Date(year, month - 1, day);

  if (isNaN(date.getTime())) {
    return null;
  }

  // Format date as YYYY-MM-DD for database
  const formattedDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return {
    ticker: ticker.toUpperCase(),
    date: formattedDate,
    note: note.trim(),
  };
}

export function generateEarningsPeriods(): string[] {
  const periods: string[] = [];
  const currentYear = new Date().getFullYear();

  // Generate periods for current year and next year
  for (let year = currentYear + 1; year >= currentYear - 1; year--) {
    for (let q = 4; q >= 1; q--) {
      periods.push(`Q${q} ${year}`);
    }
  }

  return periods;
}
