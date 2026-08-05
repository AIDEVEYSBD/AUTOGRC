import PlatformShell from "@/components/app-shell/PlatformShell";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PlatformShell>{children}</PlatformShell>;
}
