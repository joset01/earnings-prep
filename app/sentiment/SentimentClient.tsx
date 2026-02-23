"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import NavDropdown from "@/components/NavDropdown";
import type { SentimentResponse, TweetResult } from "@/app/api/sentiment/route";

interface SentimentClientProps {
  userEmail: string;
}

const LABEL_STYLES = {
  bullish: {
    badge: "bg-green-900/50 text-green-300 border border-green-700",
    heading: "text-green-400",
  },
  neutral: {
    badge: "bg-gray-700 text-gray-300 border border-gray-600",
    heading: "text-gray-300",
  },
  bearish: {
    badge: "bg-red-900/50 text-red-300 border border-red-700",
    heading: "text-red-400",
  },
};

function MessageCard({ msg }: { msg: TweetResult }) {
  const style = LABEL_STYLES[msg.sentiment];
  return (
    <div className="border border-gray-700 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <span className="text-xs text-blue-400 font-mono">@{msg.username}</span>
          <p className="text-sm text-gray-200 mt-1 leading-relaxed">{msg.text}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full shrink-0 font-medium ${style.badge}`}>
          {msg.sentiment}
        </span>
      </div>
    </div>
  );
}

function SentimentBar({ bullish, neutral, bearish, total }: {
  bullish: number; neutral: number; bearish: number; total: number;
}) {
  const bPct = Math.round((bullish / total) * 100);
  const nPct = Math.round((neutral / total) * 100);
  const rPct = 100 - bPct - nPct;

  return (
    <div>
      <div className="flex rounded-full overflow-hidden h-4 w-full">
        {bPct > 0 && <div className="bg-green-500 transition-all" style={{ width: `${bPct}%` }} />}
        {nPct > 0 && <div className="bg-gray-500 transition-all" style={{ width: `${nPct}%` }} />}
        {rPct > 0 && <div className="bg-red-500 transition-all" style={{ width: `${rPct}%` }} />}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span className="text-green-400">{bPct}% bullish</span>
        <span>{nPct}% neutral</span>
        <span className="text-red-400">{rPct}% bearish</span>
      </div>
    </div>
  );
}

export default function SentimentClient({ userEmail }: SentimentClientProps) {
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SentimentResponse | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handleAnalyze = async () => {
    const clean = ticker.trim().replace(/^\$/, "").toUpperCase();
    if (!clean) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/sentiment?ticker=${clean}`);

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAnalyze();
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <NavDropdown currentPage="sentiment" />
            <h1 className="text-xl font-bold text-gray-100">Stocktwits Sentiment</h1>
          </div>
          <Image src="/logo.jpg" alt="Logo" width={160} height={160} className="rounded" />
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

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Search */}
        <div className="bg-gray-800 p-4 rounded-lg shadow-md mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Enter a stock ticker to analyze Stocktwits sentiment
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono">$</span>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                placeholder="NVDA"
                className="w-full pl-7 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100 placeholder-gray-400 font-mono uppercase"
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={loading || !ticker.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Loading..." : "Analyze"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Pulls the latest ~30 Stocktwits posts for ${ticker || "TICKER"} — sentiment is tagged by users directly.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-gray-400 text-sm">Fetching Stocktwits data...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-4">
            {/* Summary card */}
            <div className="bg-gray-800 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="font-mono text-2xl font-bold text-gray-100">${result.ticker}</span>
                  <span className="ml-3 text-sm text-gray-400">{result.tweetCount} posts analyzed</span>
                </div>
                <span className={`text-lg font-bold uppercase tracking-wide ${LABEL_STYLES[result.label].heading}`}>
                  {result.label}
                </span>
              </div>

              <SentimentBar
                bullish={result.bullish}
                neutral={result.neutral}
                bearish={result.bearish}
                total={result.tweetCount}
              />

              <div className="grid grid-cols-3 gap-3 mt-4">
                {(["bullish", "neutral", "bearish"] as const).map((l) => (
                  <div key={l} className="bg-gray-700/50 rounded-lg p-3 text-center">
                    <div className={`text-2xl font-bold ${LABEL_STYLES[l].heading}`}>
                      {result[l]}
                    </div>
                    <div className="text-xs text-gray-400 capitalize mt-0.5">{l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-medium text-gray-400 mb-3">Recent posts</h2>
              <div className="space-y-2">
                {result.messages.map((msg) => (
                  <MessageCard key={msg.id} msg={msg} />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
