"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import NavDropdown from "@/components/NavDropdown";

interface MatrixClientProps {
  userEmail: string;
}

export default function MatrixClient({ userEmail }: MatrixClientProps) {
  const router = useRouter();
  const supabase = createClient();

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
        <div className="text-center text-gray-400 py-16">
          Earnings Matrix - Coming Soon
        </div>
      </main>
    </div>
  );
}
