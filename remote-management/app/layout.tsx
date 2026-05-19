import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Remote Management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-(--color-background) text-(--color-foreground)">
        {children}
      </body>
    </html>
  );
}
