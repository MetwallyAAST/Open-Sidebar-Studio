import type { Metadata } from "next";
import "./globals.css";
import "@/components/admin/builder.css";
export const metadata: Metadata = {
  title: "Sidebar Studio",
  description: "A configurable navigation system and visual builder.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
