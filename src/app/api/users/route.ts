import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listProvisionedUsers } from "@/lib/users.queries";

export const runtime = "nodejs";

/**
 * Read-only list of locally provisioned users (keyed by SSO `sub`). Identity and
 * roles are owned by AutoX ID — this endpoint exists purely for admin visibility.
 * There is no write endpoint: role/status changes happen in the AutoX ID admin board.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });

  try {
    const users = await listProvisionedUsers();
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({
      users: [],
      error: "Run the database migration (npm run migrate) to enable this view.",
    });
  }
}
