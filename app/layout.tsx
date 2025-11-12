import type { Metadata } from "next";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";

export const metadata: Metadata = {
  title: "Kimia Innovation Platform",
  description: "Educational Innovation and Research Project Management",
  icons: {
    icon: [
      { url: "/kimia-imago.png", sizes: "any" },
      { url: "/kimia.png", sizes: "512x512", type: "image/png" }
    ],
    apple: "/kimia.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
