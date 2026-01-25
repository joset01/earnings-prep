"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateEarningsPeriods } from "@/lib/parseEntry";

interface EntryFormProps {
  onEntryAdded: () => void;
}

const FLAG_OPTIONS = [
  { value: "", label: "None" },
  { value: "check", label: "✓" },
  { value: "star", label: "⭐" },
];

export default function EntryForm({ onEntryAdded }: EntryFormProps) {
  const [ticker, setTicker] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");
  const [flag, setFlag] = useState("");
  const [period, setPeriod] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const periods = generateEarningsPeriods();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!ticker.trim()) {
      setError("Please enter a ticker");
      return;
    }

    if (!entryDate) {
      setError("Please select a date");
      return;
    }

    if (!note.trim()) {
      setError("Please enter a note");
      return;
    }

    if (!period) {
      setError("Please select an earnings period");
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be logged in to add entries");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("entries").insert({
      user_id: user.id,
      ticker: ticker.toUpperCase().trim(),
      entry_date: entryDate,
      source: source.trim() || null,
      note: note.trim(),
      flag: flag || null,
      earnings_period: period,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setTicker("");
      setEntryDate("");
      setSource("");
      setNote("");
      setFlag("");
      onEntryAdded();
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 p-4 rounded-lg shadow-md mb-6">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="ticker" className="block text-sm font-medium text-gray-300 mb-1">
            Ticker
          </label>
          <input
            id="ticker"
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="WFC"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100 placeholder-gray-400 uppercase"
          />
        </div>

        <div>
          <label htmlFor="entryDate" className="block text-sm font-medium text-gray-300 mb-1">
            Date
          </label>
          <input
            id="entryDate"
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="source" className="block text-sm font-medium text-gray-300 mb-1">
            Source
          </label>
          <input
            id="source"
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Blog, earnings call, SEC filing..."
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100 placeholder-gray-400"
          />
        </div>

        <div>
          <label htmlFor="flag" className="block text-sm font-medium text-gray-300 mb-1">
            Flag
          </label>
          <select
            id="flag"
            value={flag}
            onChange={(e) => setFlag(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100"
          >
            {FLAG_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="note" className="block text-sm font-medium text-gray-300 mb-1">
          Note
        </label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Enter your observation or insight..."
          rows={3}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100 placeholder-gray-400 resize-none"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="period" className="block text-sm font-medium text-gray-300 mb-1">
          Earnings Period
        </label>
        <select
          id="period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100"
        >
          <option value="">Select period...</option>
          {periods.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-900/50 p-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Adding..." : "Add Entry"}
      </button>
    </form>
  );
}
