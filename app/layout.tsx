import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Conference Lead Scanner",
  description: "Sponsor lead capture for conference events",
  manifest: "/manifest.json",
  themeColor: "#07070f",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
