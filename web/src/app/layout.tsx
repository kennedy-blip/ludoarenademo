import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ludo Arena KE — Play Ludo, Climb the Ranks",
  description:
    "Kenya's Ludo arena. Play free or stake in Beast Mode, earn ratings, chase weekly tournaments and climb the national leaderboard.",
  applicationName: "Ludo Arena KE",
  keywords: ["ludo", "kenya", "mpesa", "board game", "leaderboard", "tournament"],
  openGraph: {
    title: "Ludo Arena KE",
    description: "Play Ludo, climb the ranks, win the week.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Ludo Arena KE" },
};

export const viewport: Viewport = {
  themeColor: "#0b0620",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
