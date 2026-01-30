"use client";

import { createClient } from "@/lib/supabase/client";

export interface Entry {
  id: string;
  ticker: string;
  entry_date: string;
  source: string | null;
  note: string;
  link: string | null;
  flag: string | null;
  earnings_period: string;
  created_at: string;
}

const FLAG_DISPLAY: Record<string, string> = {
  green: "🟩",
  yellow: "🟨",
  red: "🟥",
};

interface EntryListProps {
  entries: Entry[];
  searchQuery: string;
  onEntryDeleted: () => void;
  onEditEntry: (entry: Entry) => void;
}

export default function EntryList({ entries, searchQuery, onEntryDeleted, onEditEntry }: EntryListProps) {
  const supabase = createClient();

  const filteredEntries = entries.filter((entry) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.ticker.toLowerCase().includes(query) ||
      entry.note.toLowerCase().includes(query) ||
      (entry.source && entry.source.toLowerCase().includes(query))
    );
  });

  // Group entries by earnings period
  const groupedEntries = filteredEntries.reduce<Record<string, Entry[]>>((acc, entry) => {
    const period = entry.earnings_period;
    if (!acc[period]) {
      acc[period] = [];
    }
    acc[period].push(entry);
    return acc;
  }, {});

  // Sort entries within each period by date (newest first)
  Object.keys(groupedEntries).forEach((period) => {
    groupedEntries[period].sort((a, b) => {
      return new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime();
    });
  });

  // Sort periods (most recent first)
  const sortedPeriods = Object.keys(groupedEntries).sort((a, b) => {
    const [qA, yearA] = a.split(" ");
    const [qB, yearB] = b.split(" ");
    if (yearA !== yearB) return Number(yearB) - Number(yearA);
    return Number(qB.replace("Q", "")) - Number(qA.replace("Q", ""));
  });

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("entries").delete().eq("id", id);
    if (!error) {
      onEntryDeleted();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (filteredEntries.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        {searchQuery ? "No entries match your search" : "No entries yet. Add your first one above!"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sortedPeriods.map((period) => (
        <div key={period} className="bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="bg-gray-700 px-4 py-2 font-semibold text-gray-200 border-b border-gray-600">
            {period}
          </div>
          <div className="divide-y divide-gray-700">
            {groupedEntries[period].map((entry) => (
              <div key={entry.id} className="p-4 hover:bg-gray-700/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      {entry.flag && (
                        <span className="text-lg" title="Flagged">
                          {FLAG_DISPLAY[entry.flag]}
                        </span>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {entry.ticker.split(",").map((t, i) => (
                          <span
                            key={i}
                            className="font-mono font-bold text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded text-sm"
                          >
                            {t.trim()}
                          </span>
                        ))}
                      </div>
                      <span className="text-sm text-gray-400">
                        {formatDate(entry.entry_date)}
                      </span>
                      {entry.source && (
                        <span className="text-sm text-gray-500 italic">
                          {entry.source}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-300">
                      {entry.note.split('\n').map((line, i, arr) => (
                        <span key={i}>
                          {line}
                          {i < arr.length - 1 && <br />}
                        </span>
                      ))}
                    </p>
                    {entry.link && (
                      <a
                        href={entry.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:text-blue-300 underline mt-1 inline-block"
                      >
                        {entry.link}
                      </a>
                    )}
                  </div>
                  <div className="flex gap-3 ml-4">
                    <button
                      onClick={() => onEditEntry(entry)}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                      title="Edit entry"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-red-500 hover:text-red-400 text-sm"
                      title="Delete entry"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
