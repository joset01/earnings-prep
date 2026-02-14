"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import NavDropdown from "@/components/NavDropdown";

export interface CompanyRow {
  id?: string;
  ticker: string;
  valuation: string;
  model: string;
  bloomberg_em: string;
  evernote: string;
  sort_order?: number;
}

interface MatrixClientProps {
  userEmail: string;
  initialCompanies: CompanyRow[];
}

export default function MatrixClient({ userEmail, initialCompanies }: MatrixClientProps) {
  const [inputValue, setInputValue] = useState("");
  const [companies, setCompanies] = useState<CompanyRow[]>(initialCompanies);
  const [sortedByTicker, setSortedByTicker] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handleAddCompanies = async () => {
    if (!inputValue.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Parse input - could be comma-separated or single ticker
    const newTickers = inputValue
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter((t) => t.length > 0);

    // Filter out duplicates
    const existingTickers = companies.map((c) => c.ticker);
    const tickersToAdd = newTickers.filter((t) => !existingTickers.includes(t));

    if (tickersToAdd.length === 0) {
      setInputValue("");
      return;
    }

    // Insert into database - new items go at the end
    const maxSortOrder = companies.length > 0
      ? Math.max(...companies.map((c) => c.sort_order ?? 0))
      : -1;

    const rowsToInsert = tickersToAdd.map((t, i) => ({
      user_id: user.id,
      ticker: t,
      valuation: "",
      model: "",
      bloomberg_em: "",
      evernote: "",
      sort_order: maxSortOrder + 1 + i,
    }));

    const { data, error } = await supabase
      .from("matrix_companies")
      .insert(rowsToInsert)
      .select();

    if (!error && data) {
      setCompanies((prev) => [...prev, ...data]);
    }

    setInputValue("");
  };

  const handleValuationChange = async (ticker: string, value: string) => {
    const company = companies.find((c) => c.ticker === ticker);
    if (!company?.id) return;

    const { error } = await supabase
      .from("matrix_companies")
      .update({ valuation: value })
      .eq("id", company.id);

    if (!error) {
      setCompanies((prev) =>
        prev.map((c) => (c.ticker === ticker ? { ...c, valuation: value } : c))
      );
    }
  };

  const handleModelChange = async (ticker: string, value: string) => {
    const company = companies.find((c) => c.ticker === ticker);
    if (!company?.id) return;

    const { error } = await supabase
      .from("matrix_companies")
      .update({ model: value })
      .eq("id", company.id);

    if (!error) {
      setCompanies((prev) =>
        prev.map((c) => (c.ticker === ticker ? { ...c, model: value } : c))
      );
    }
  };

  const handleBloombergEmChange = async (ticker: string, value: string) => {
    const company = companies.find((c) => c.ticker === ticker);
    if (!company?.id) return;

    const { error } = await supabase
      .from("matrix_companies")
      .update({ bloomberg_em: value })
      .eq("id", company.id);

    if (!error) {
      setCompanies((prev) =>
        prev.map((c) => (c.ticker === ticker ? { ...c, bloomberg_em: value } : c))
      );
    }
  };

  const handleEvernoteChange = async (ticker: string, value: string) => {
    const company = companies.find((c) => c.ticker === ticker);
    if (!company?.id) return;

    const { error } = await supabase
      .from("matrix_companies")
      .update({ evernote: value })
      .eq("id", company.id);

    if (!error) {
      setCompanies((prev) =>
        prev.map((c) => (c.ticker === ticker ? { ...c, evernote: value } : c))
      );
    }
  };

  const handleDelete = async (ticker: string) => {
    const company = companies.find((c) => c.ticker === ticker);
    if (!company?.id) return;

    const { error } = await supabase
      .from("matrix_companies")
      .delete()
      .eq("id", company.id);

    if (!error) {
      setCompanies((prev) => prev.filter((c) => c.ticker !== ticker));
    }
  };

  const handleSortByTicker = () => {
    setCompanies((prev) => [...prev].sort((a, b) => a.ticker.localeCompare(b.ticker)));
    setSortedByTicker(true);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null || dragOverIndex === null || draggedIndex === dragOverIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newCompanies = [...companies];
    const [draggedItem] = newCompanies.splice(draggedIndex, 1);
    newCompanies.splice(dragOverIndex, 0, draggedItem);

    // Update sort_order for all items
    const updatedCompanies = newCompanies.map((company, index) => ({
      ...company,
      sort_order: index,
    }));

    setCompanies(updatedCompanies);
    setDraggedIndex(null);
    setDragOverIndex(null);

    // Persist new order to database
    for (const company of updatedCompanies) {
      if (company.id) {
        await supabase
          .from("matrix_companies")
          .update({ sort_order: company.sort_order })
          .eq("id", company.id);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <NavDropdown currentPage="matrix" />
            <h1 className="text-xl font-bold text-gray-100">Earnings Matrix</h1>
          </div>
          <Image
            src="/logo.jpg"
            alt="Logo"
            width={160}
            height={160}
            className="rounded hidden md:block"
          />
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:inline">{userEmail}</span>
            <button
              onClick={handleSignOut}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-gray-800 p-4 rounded-lg shadow-md mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Companies to analyze this earnings season
          </label>
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter company tickers (e.g., WFC, JPM, BAC)"
            rows={3}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100 placeholder-gray-400 resize-none mb-3"
          />
          <button
            onClick={handleAddCompanies}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Enter
          </button>
        </div>

        {companies.length > 0 && (
          <div className="bg-gray-800 rounded-lg shadow-md overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-gray-700">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-200">
                    <button
                      onClick={handleSortByTicker}
                      className="text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      Ticker
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-200">
                    Valuation
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-200">
                    Model
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-200">
                    Bloomberg EM q/q
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-200">
                    Evernote
                  </th>
                  <th className="px-4 py-3"></th>
                  <th className="px-2 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {companies.map((company, index) => (
                  <tr
                    key={company.ticker}
                    className={`hover:bg-gray-700/50 ${dragOverIndex === index ? "bg-gray-600" : ""}`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    <td className="px-4 py-3 text-gray-100 font-mono">
                      {company.ticker}
                    </td>
                    <td className="px-4 py-3 text-gray-100">
                      <select
                        value={company.valuation}
                        onChange={(e) => handleValuationChange(company.ticker, e.target.value)}
                        className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-100"
                      >
                        <option value="">--</option>
                        <option value="green">🟩</option>
                        <option value="yellow">🟨</option>
                        <option value="red">🟥</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-100">
                      <select
                        value={company.model}
                        onChange={(e) => handleModelChange(company.ticker, e.target.value)}
                        className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-100"
                      >
                        <option value="">--</option>
                        <option value="green">🟩</option>
                        <option value="yellow">🟨</option>
                        <option value="red">🟥</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-100">
                      <select
                        value={company.bloomberg_em}
                        onChange={(e) => handleBloombergEmChange(company.ticker, e.target.value)}
                        className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-100"
                      >
                        <option value="">--</option>
                        <option value="green">🟩</option>
                        <option value="yellow">🟨</option>
                        <option value="red">🟥</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-100">
                      <select
                        value={company.evernote}
                        onChange={(e) => handleEvernoteChange(company.ticker, e.target.value)}
                        className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-100"
                      >
                        <option value="">--</option>
                        <option value="green">🟩</option>
                        <option value="yellow">🟨</option>
                        <option value="red">🟥</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(company.ticker)}
                        className="text-red-500 hover:text-red-400 text-sm"
                      >
                        Delete
                      </button>
                    </td>
                    <td className="px-2 py-3">
                      <span
                        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-200"
                        title="Drag to reorder"
                      >
                        ⠿
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
