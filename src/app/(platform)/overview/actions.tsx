"use server"

import { getControlsByDomain, type ControlInDomain } from "@/lib/overview.queries"
export const dynamic = "force-dynamic"
export async function fetchControlsByDomain(
  masterFrameworkId: string,
  domainName: string
): Promise<ControlInDomain[]> {
  return getControlsByDomain(masterFrameworkId, domainName)
}