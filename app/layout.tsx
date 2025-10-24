import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Community Vault",
  description:
    "A Whop-native knowledge vault for creators to monetize and share multimedia guides with AI assistance."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn("min-h-screen bg-background font-sans", inter.variable)}>
        <Providers>
          {children}
          <Analytics />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
