import type { Metadata } from "next";
import { Geist_Mono, Inter, Figtree, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-figtree",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Soltix",
  description: "",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" as="image" href="/images/hero_bg.jpeg" type="image/jpeg" />
        <link rel="preload" as="video" href="/bg1.mp4" type="video/mp4" />
      </head>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${geistMono.variable} ${figtree.variable} ${instrumentSerif.variable} antialiased`}
      >
        <DynamicContextProvider
          settings={{
            environmentId: "81ca04f7-1915-4295-a520-f3a2941e6b54",
          }}
        >
          {children}
        </DynamicContextProvider>
      </body>
    </html>
  );
}