"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import NavDropdown from "@/components/NavDropdown";

interface SentimentResult {
  companyName: string;
  summary: string;
  sentiment: "positive" | "neutral" | "negative";
  sources: { title: string; url: string; source: string }[];
}

function SentimentGauge({ sentiment }: { sentiment: "positive" | "neutral" | "negative" }) {
  // Needle angle: -90 = far left (negative), 0 = center (neutral), 90 = far right (positive)
  const angle = sentiment === "positive" ? 70 : sentiment === "negative" ? -70 : 0;
  const label = sentiment === "positive" ? "Positive" : sentiment === "negative" ? "Negative" : "Neutral";
  const labelColor = sentiment === "positive" ? "#4ade80" : sentiment === "negative" ? "#f87171" : "#facc15";

  // Needle endpoint
  const cx = 80, cy = 80, r = 55;
  const rad = ((angle - 90) * Math.PI) / 180;
  const nx = cx + r * Math.cos(rad);
  const ny = cy + r * Math.sin(rad);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="160" height="100" viewBox="0 0 160 100">
        {/* Red arc (left) */}
        <path d="M 18 80 A 62 62 0 0 1 52 27" fill="none" stroke="#f87171" strokeWidth="10" strokeLinecap="round" />
        {/* Yellow arc (center) */}
        <path d="M 52 27 A 62 62 0 0 1 108 27" fill="none" stroke="#facc15" strokeWidth="10" strokeLinecap="round" />
        {/* Green arc (right) */}
        <path d="M 108 27 A 62 62 0 0 1 142 80" fill="none" stroke="#4ade80" strokeWidth="10" strokeLinecap="round" />
        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        {/* Center dot */}
        <circle cx={cx} cy={cy} r="4" fill="white" />
      </svg>
      <span className="text-sm font-semibold" style={{ color: labelColor }}>{label}</span>
    </div>
  );
}

interface SentimentClientProps {
  userEmail: string;
}

export default function SentimentClient({ userEmail }: SentimentClientProps) {
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SentimentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handleAnalyze = async () => {
    if (!ticker.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/sentiment?ticker=${encodeURIComponent(ticker.trim().toUpperCase())}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Failed to fetch sentiment data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <NavDropdown currentPage="sentiment" />
            <h1 className="text-xl font-bold text-gray-100">Employee Sentiment</h1>
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

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex gap-3 mb-8">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            placeholder="Enter ticker (e.g. AAPL)"
            className="flex-1 bg-gray-800 border border-gray-600 rounded-md px-4 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || !ticker.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors"
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-sm">Fetching data and generating summary...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-md px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <h2 className="text-lg font-semibold text-gray-100">{result.companyName}</h2>
              <SentimentGauge sentiment={result.sentiment} />
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-md px-5 py-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Sentiment Summary</h3>
              <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{result.summary}</p>
            </div>

            {result.sources.length > 0 && (
              <div className="bg-gray-800 border border-gray-700 rounded-md px-5 py-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Sources</h3>
                <ul className="space-y-2">
                  {result.sources.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-gray-500 shrink-0">[{s.source}]</span>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline line-clamp-2"
                      >
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
