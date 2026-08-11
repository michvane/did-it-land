import type { Metadata } from "next";
import "../src/styles.css";

export const metadata: Metadata = {
  title: "Did It Land?",
  description: "Verify what happened in a Solana transaction.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
