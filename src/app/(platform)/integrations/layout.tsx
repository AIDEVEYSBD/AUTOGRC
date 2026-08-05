import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Integrations",
};

export default async function IntegrationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Integrations management is restricted to admins and compliance leads.
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !["admin", "compliance_lead"].includes(role)) {
    redirect("/overview");
  }
  return <>{children}</>;
}
