import type { ReactNode } from "react";

export const metadata = {
  title: "Conquests of Alexander",
  description: "A browser, turn-based 4X-lite themed on Civ 6's Conquests of Alexander.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
