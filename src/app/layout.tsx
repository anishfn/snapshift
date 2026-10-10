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
  title: "chat · SubQ Snap picks how every answer looks",
  description: "A chat that keeps everything in context and lets SubQ Snap decide how to show each answer.",
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
