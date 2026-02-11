import "./globals.css";
import { Metadata } from "next";
import ChatBubble from "@/components/Chatbot/ChatBubble";

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
      <body className="bg-white">
        {/* Global page wrapper - full width, responsive */}
        <div className="relative w-full min-h-screen text-[#333333]">
          {children}
        </div>

        {/* Global chatbot */}
        <ChatBubble />
      </body>
    </html>
  );
}