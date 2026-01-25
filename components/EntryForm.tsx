"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateEarningsPeriods } from "@/lib/parseEntry";
import { Entry } from "./EntryList";

interface EntryFormProps {
  onEntryAdded: () => void;
  editingEntry?: Entry | null;
  onCancelEdit?: () => void;
}

const FLAG_OPTIONS = [
  { value: "", label: "None" },
  { value: "green", label: "🟩 Green" },
  { value: "yellow", label: "🟨 Yellow" },
  { value: "red", label: "🟥 Red" },
];

export default function EntryForm({ onEntryAdded, editingEntry, onCancelEdit }: EntryFormProps) {
  const [ticker, setTicker] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const [flag, setFlag] = useState("");
  const [period, setPeriod] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const periods = generateEarningsPeriods();

  const isEditing = !!editingEntry;

  // Pre-fill form when editing
  useEffect(() => {
    if (editingEntry) {
      setTicker(editingEntry.ticker);
      setEntryDate(editingEntry.entry_date);
      setSource(editingEntry.source || "");
      setNote(editingEntry.note);
      setLink(editingEntry.link || "");
      setFlag(editingEntry.flag || "");
      setPeriod(editingEntry.earnings_period);
    }
  }, [editingEntry]);

  const clearForm = () => {
    setTicker("");
    setEntryDate("");
    setSource("");
    setNote("");
    setLink("");
    setFlag("");
    setPeriod("");
    setError(null);
  };

  const handleCancel = () => {
    clearForm();
    onCancelEdit?.();
  };

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

    // Format tickers: uppercase, trim whitespace, remove empty entries
    const formattedTickers = ticker
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter((t) => t.length > 0)
      .join(", ");

    const entryData = {
      ticker: formattedTickers,
      entry_date: entryDate,
      source: source.trim() || null,
      note: note.trim(),
      link: link.trim() || null,
      flag: flag || null,
      earnings_period: period,
    };

    let dbError;

    if (isEditing) {
      // Update existing entry
      const { error } = await supabase
        .from("entries")
        .update(entryData)
        .eq("id", editingEntry.id);
      dbError = error;
    } else {
      // Insert new entry
      const { error } = await supabase.from("entries").insert({
        user_id: user.id,
        ...entryData,
      });
      dbError = error;
    }

    if (dbError) {
      setError(dbError.message);
    } else {
      clearForm();
      onCancelEdit?.();
      onEntryAdded();
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 p-4 rounded-lg shadow-md mb-6">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="ticker" className="block text-sm font-medium text-gray-300 mb-1">
            Ticker(s)
          </label>
          <input
            id="ticker"
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="WFC or WFC, JPM, BAC"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100 placeholder-gray-400 uppercase"
          />
          <p className="text-xs text-gray-400 mt-1">Separate multiple tickers with commas</p>
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
        <label htmlFor="link" className="block text-sm font-medium text-gray-300 mb-1">
          Link <span className="text-gray-500">(optional)</span>
        </label>
        <input
          id="link"
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://..."
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100 placeholder-gray-400"
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

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (isEditing ? "Updating..." : "Adding...") : (isEditing ? "Edit Entry" : "Add Entry")}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
