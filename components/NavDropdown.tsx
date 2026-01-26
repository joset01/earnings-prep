"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface NavDropdownProps {
  currentPage: "dashboard" | "matrix";
}

const NAV_ITEMS = [
  { id: "dashboard", label: "Earnings Notes", href: "/dashboard" },
  { id: "matrix", label: "Earnings Matrix", href: "/matrix" },
];

export default function NavDropdown({ currentPage }: NavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentItem = NAV_ITEMS.find((item) => item.id === currentPage);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 hover:bg-gray-600 transition-colors"
      >
        {currentItem?.label}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-50 min-w-[180px]">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`block px-4 py-2 text-sm hover:bg-gray-600 transition-colors ${
                item.id === currentPage
                  ? "text-blue-400 bg-gray-600/50"
                  : "text-gray-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
