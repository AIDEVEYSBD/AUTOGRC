import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Integrations",
};

export default async function IntegrationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Integrations management is restricted to admins and compliance leads.
  const session = await getSession();
  if (!session || !["admin", "compliance_lead"].includes(session.role)) {
    redirect("/overview");
  }
  return <>{children}</>;
}