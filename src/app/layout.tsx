import "./globals.css";
import { Metadata } from "next";
import { auth } from "@/auth";
import { AuthProvider } from "@/context/AuthContext";
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isAuthenticated = !!session?.user;
  const initialUser = session?.user
    ? {
        id: session.user.id ?? "",
        name: session.user.name ?? "",
        email: session.user.email ?? "",
        role: session.user.role ?? "viewer",
      }
    : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply dark class before first paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch(e) {}
})();
            `.trim(),
          }}
        />
      </head>
      <body
        className="min-h-screen"
        style={{ backgroundColor: "var(--md-surface)", color: "var(--md-on-surface)" }}
      >
        <AuthProvider initialAuth={isAuthenticated} initialUser={initialUser}>
          <div className="relative w-full min-h-screen">
            {children}
          </div>

          {/* Global chatbot — only visible when authenticated */}
          <ChatBubble />
        </AuthProvider>
      </body>
    </html>
  );
}
