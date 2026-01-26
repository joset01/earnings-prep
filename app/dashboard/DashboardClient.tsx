"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import EntryForm from "@/components/EntryForm";
import EntryList, { Entry } from "@/components/EntryList";
import SearchBar from "@/components/SearchBar";
import NavDropdown from "@/components/NavDropdown";

interface DashboardClientProps {
  initialEntries: Entry[];
  userEmail: string;
}

export default function DashboardClient({ initialEntries, userEmail }: DashboardClientProps) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const refreshEntries = useCallback(async () => {
    const { data } = await supabase
      .from("entries")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setEntries(data);
    }
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <NavDropdown currentPage="dashboard" />
            <h1 className="text-xl font-bold text-gray-100">Earnings Prep</h1>
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
        <EntryForm
          onEntryAdded={refreshEntries}
          editingEntry={editingEntry}
          onCancelEdit={() => setEditingEntry(null)}
        />
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
        <EntryList
          entries={entries}
          searchQuery={searchQuery}
          onEntryDeleted={refreshEntries}
          onEditEntry={setEditingEntry}
        />
      </main>
    </div>
  );
}
