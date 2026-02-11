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
      <body className="relative min-h-screen bg-white text-[#333333] overflow-hidden">
        {/* Aurora glow layer */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-gradient-to-br from-cyan-400/40 via-blue-400/30 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/3 -right-40 w-[700px] h-[700px] bg-gradient-to-tr from-indigo-400/40 via-purple-400/30 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-[-200px] left-1/3 w-[600px] h-[600px] bg-gradient-to-t from-emerald-300/40 via-teal-300/30 to-transparent rounded-full blur-3xl" />
        </div>

        {/* Global page wrapper */}
        <div className="relative mx-auto max-w-6xl px-6 py-24">
          {children}
        </div>
      </body>
    </html>
  );
}
