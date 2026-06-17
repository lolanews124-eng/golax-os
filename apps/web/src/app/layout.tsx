import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Golax Prospect AI OS",
  description: "AI-powered prospect research platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-muted/30 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
