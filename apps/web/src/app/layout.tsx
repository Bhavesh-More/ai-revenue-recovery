import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../context/ThemeContext";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "RevRecovery AI — AI Revenue Recovery Platform",
  description: "AI-powered revenue recovery platform dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} h-full antialiased font-mono`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#F0F2F5] dark:bg-[#131416] text-[#1A1A1A] dark:text-[#F9FAFB] font-mono transition-colors">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
