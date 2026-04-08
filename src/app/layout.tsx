import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { MarketTicker } from "@/components/layout/MarketTicker";

export const metadata: Metadata = {
  title: "0xShoyu | Product Engineer",
  description: "Former COO turned Full-Stack Product Engineer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground antialiased">
        <MarketTicker />
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
