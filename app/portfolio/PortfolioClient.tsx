"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import NavDropdown from "@/components/NavDropdown";

interface PortfolioClientProps {
  userEmail: string;
  initialTickers: string;
}

function parseTickers(raw: string): string[] {
  return raw
    .split(/[\s,;|\n]+/)
    .map((t) => t.replace(/^\$/, "").toUpperCase().trim())
    .filter((t) => t.length > 0);
}

export default function PortfolioClient({ userEmail, initialTickers }: PortfolioClientProps) {
  const [text, setText] = useState(initialTickers);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const router = useRouter();
  const supabase = createClient();

  const tickers = parseTickers(text);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handleSave = async () => {
    setStatus("saving");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setStatus("error");
      return;
    }

    const { error } = await supabase
      .from("portfolio")
      .upsert({ user_id: user.id, tickers: text, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

    setStatus(error ? "error" : "saved");

    if (!error) {
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <NavDropdown currentPage="portfolio" />
            <h1 className="text-xl font-bold text-gray-100">Portfolio</h1>
          </div>
          <Image src="/logo.jpg" alt="Logo" width={160} height={160} className="rounded hidden md:block" />
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

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Paste your portfolio tickers
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Any format works — comma, space, or newline separated. Dollar signs are stripped automatically.
          </p>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setStatus("idle"); }}
            placeholder={"AAPL MSFT NVDA\nGOOGL, AMZN\n$TSLA"}
            rows={8}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100 placeholder-gray-500 font-mono text-sm resize-y"
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-500">
              {tickers.length > 0 ? `${tickers.length} ticker${tickers.length === 1 ? "" : "s"} detected` : "No tickers yet"}
            </span>
            <button
              onClick={handleSave}
              disabled={status === "saving"}
              className="px-5 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "saving" ? "Saving..." : "Save"}
            </button>
          </div>
          {status === "saved" && (
            <p className="text-green-400 text-xs mt-2">Saved successfully.</p>
          )}
          {status === "error" && (
            <p className="text-red-400 text-xs mt-2">Failed to save — please try again.</p>
          )}
        </div>

        {tickers.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-sm font-medium text-gray-300 mb-3">Parsed tickers</h2>
            <div className="flex flex-wrap gap-2">
              {tickers.map((t) => (
                <span key={t} className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs font-mono text-gray-100">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
