import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { DEFAULT_HOME_DESCRIPTION, DEFAULT_HOME_TITLE } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://forge.directory"),
  title: {
    default: DEFAULT_HOME_TITLE,
    template: "%s | Forge",
  },
  description: DEFAULT_HOME_DESCRIPTION,
  openGraph: {
    title: DEFAULT_HOME_TITLE,
    description: DEFAULT_HOME_DESCRIPTION,
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrument.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-ink font-sans text-white">{children}</body>
    </html>
  );
}
