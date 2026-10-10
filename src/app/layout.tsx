import type { Metadata } from "next";
import { JetBrains_Mono, Public_Sans } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

// Code only, so not preloaded.
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "snapshift · SubQ Snap reads the whole chat and picks how every answer looks",
  description: "SubQ Snap reads everything in the chat on every turn (messages, PDFs, images, spreadsheets, repositories) and decides how to show each answer.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${publicSans.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
