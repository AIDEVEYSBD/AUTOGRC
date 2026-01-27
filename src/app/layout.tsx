import "./globals.css";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | AutoGRC",
    default: "AutoGRC",
  },
  description: "Automated Cyber Governance Platform",
  icons: {
    icon: "/AutoGRC.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Global background grid */}
        <div className="app-background" />

        {/* Global page wrapper */}
        <div className="relative mx-auto max-w-6xl px-6 py-24 text-[#333333]">
          {children}
        </div>
      </body>
    </html>
  );
}