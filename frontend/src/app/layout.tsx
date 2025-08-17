import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Pika Vault - Omnichain ETF Vaults",
  description: "Cross-chain vault system for seamless multi-chain asset management",
};

/**
 * Root layout for the Next.js app
 *
 * @param props - { object } - The props for the RootLayout component
 * @param props.children - { React.ReactNode } - The children to wrap
 * @returns The wrapped children
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          <div className="flex min-h-screen flex-col">
            {children}
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
