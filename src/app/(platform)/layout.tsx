import Navbar from "../../components/Navbar";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />

      {/* 
        Stable top padding so content never jumps.
        Navbar height = h-16 (64px) → pt-20 gives breathing room.
      */}
      <main className="pt-20">
        {children}
      </main>
    </>
  );
}
