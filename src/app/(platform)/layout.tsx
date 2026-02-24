import NavigationRail from "../../components/NavigationRail";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavigationRail />

      {/* Desktop: offset for rail (80px). Mobile: offset for bottom nav (64px). */}
      <main className="md:pl-20 pb-16 md:pb-0 min-h-screen" style={{ backgroundColor: "var(--md-surface)" }}>
        {children}
      </main>
    </>
  );
}
