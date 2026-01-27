import { Metadata } from "next";

export const metadata: Metadata = {
  title: "SOC Mapper",
};

export default function FrameworkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}