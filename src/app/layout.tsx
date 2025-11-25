import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Planetarium",
  description: "Interactive 3D solar system simulation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
