import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppSidebar } from "./components/app-sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DeductionOS",
  description: "Deduction workflow dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full bg-white text-gray-900 antialiased`}
    >
      <body className="min-h-screen bg-white text-gray-900">
        <div className="min-h-screen bg-white md:grid md:grid-cols-[16rem_1fr]">
          <div className="hidden md:block">
            <AppSidebar />
          </div>
          <div>{children}</div>
        </div>
      </body>
    </html>
  );
}
