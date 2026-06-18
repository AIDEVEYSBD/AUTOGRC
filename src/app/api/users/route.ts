import { NextRequest, NextResponse } from "next/server";
import { getSession, type Role } from "@/lib/auth";
import { listUsers, updateUser, type UserStatus } from "@/lib/users.queries";

const ROLES: Role[] = ["admin", "compliance_lead", "assessor", "viewer"];
const STATUSES: UserStatus[] = ["active", "invited", "disabled"];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });

  try {
    const users = await listUsers();
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ users: [], error: "Run the database migration to enable user management." });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "User id required" }, { status: 400 });

  const role = ROLES.includes(body.role) ? (body.role as Role) : undefined;
  const status = STATUSES.includes(body.status) ? (body.status as UserStatus) : undefined;
  if (!role && !status) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  try {
    await updateUser(id, { role, status });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
