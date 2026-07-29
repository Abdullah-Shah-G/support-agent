import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SupportAgent - AI Customer Support",
  description: "AI-powered support ticket creation assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
