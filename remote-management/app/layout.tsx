import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Remote Management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex h-16 items-center gap-8">
              <span className="font-bold text-lg">Remote Management</span>
              <Link href="/" className="text-gray-700 hover:text-gray-900">
                Status
              </Link>
              <Link href="/logs" className="text-gray-700 hover:text-gray-900">
                Logs
              </Link>
              <Link href="/management" className="text-gray-700 hover:text-gray-900">
                Management
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
