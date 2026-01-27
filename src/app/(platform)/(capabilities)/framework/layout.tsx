import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Framework Baseliner",
};

export default function FrameworkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}