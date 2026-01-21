"use server"
export const dynamic = "force-dynamic"

import { getControlsByDomain, type ControlInDomain } from "@/lib/overview.queries"

export async function fetchControlsByDomain(
  masterFrameworkId: string,
  domainName: string
): Promise<ControlInDomain[]> {
  return getControlsByDomain(masterFrameworkId, domainName)
}