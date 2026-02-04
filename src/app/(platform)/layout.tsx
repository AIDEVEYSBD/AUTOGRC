import Navbar from "../../components/Navbar";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        {children}
      </main>
    </>
  );
}
