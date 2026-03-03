import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Framework Workbench",
}

export default function FrameworkWorkbenchLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
