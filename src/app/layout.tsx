import { Analytics } from "@vercel/analytics/next";
import type { Viewport } from "next";
import type { ReactNode } from "react";
import "../styles/globals.css";

export const metadata = {
  title: "Conquests of Alexander",
  description: "A browser, turn-based 4X-lite themed on Civ 6's Conquests of Alexander.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
