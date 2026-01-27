import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Integrations",
};

export default function FrameworkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}