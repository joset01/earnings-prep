import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Earnings Prep",
  description: "Track research notes before earnings reports",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-900 min-h-screen text-gray-100">{children}</body>
    </html>
  );
}
