"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import NavDropdown from "@/components/NavDropdown";

interface MatrixClientProps {
  userEmail: string;
}

interface CompanyRow {
  ticker: string;
  valuation: string;
}

export default function MatrixClient({ userEmail }: MatrixClientProps) {
  const [inputValue, setInputValue] = useState("");
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handleAddCompanies = () => {
    if (!inputValue.trim()) return;

    // Parse input - could be comma-separated or single ticker
    const newTickers = inputValue
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter((t) => t.length > 0);

    // Add to list (avoiding duplicates)
    setCompanies((prev) => {
      const existingTickers = prev.map((c) => c.ticker);
      const newRows = newTickers
        .filter((t) => !existingTickers.includes(t))
        .map((t) => ({ ticker: t, valuation: "" }));
      return [...prev, ...newRows];
    });

    setInputValue("");
  };

  const handleValuationChange = (ticker: string, value: string) => {
    setCompanies((prev) =>
      prev.map((c) => (c.ticker === ticker ? { ...c, valuation: value } : c))
    );
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <NavDropdown currentPage="matrix" />
            <h1 className="text-xl font-bold text-gray-100">Earnings Matrix</h1>
          </div>
          <Image
            src="/logo.jpg"
            alt="Logo"
            width={160}
            height={160}
            className="rounded"
          />
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{userEmail}</span>
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
          <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-700">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-200">
                    Ticker
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-200">
                    Valuation
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {companies.map((company) => (
                  <tr key={company.ticker} className="hover:bg-gray-700/50">
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
                        <option value="check">✓</option>
                        <option value="tilde">~</option>
                      </select>
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
