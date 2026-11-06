import type { Metadata, Viewport } from "next";
import { Inter_Tight } from "next/font/google";
import "./globals.css";

const inter = Inter_Tight({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Vitrine | The Bank With Glass Walls",
  description:
    "Vitrine is a full-reserve bank. It never lends your deposits, it holds every dollar in reserves you can check yourself, and a run on it can't close it.",
};

export const viewport: Viewport = {
  themeColor: "#c9e6da",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
