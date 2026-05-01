import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Sarabun } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sarabun",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Holding OS — Mission Control",
  description: "Multi-agent AI orchestrator. Smart routing, agent planning, swarm intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
      <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${sarabun.variable}`}>
        <body className="antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
