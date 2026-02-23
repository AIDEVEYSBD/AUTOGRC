import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Auto-create table on first use
async function ensureTable() {
  await db`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      session_id TEXT PRIMARY KEY,
      history JSONB NOT NULL DEFAULT '[]',
      ui_messages JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  try {
    await ensureTable();
    const rows = await db<{ history: unknown; ui_messages: unknown }[]>`
      SELECT history, ui_messages FROM chat_sessions WHERE session_id = ${sessionId}
    `;
    if (!rows[0]) return NextResponse.json({ history: [], uiMessages: [] });
    return NextResponse.json({ history: rows[0].history, uiMessages: rows[0].ui_messages });
  } catch (err) {
    console.error("[chat-history GET]", err);
    return NextResponse.json({ history: [], uiMessages: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { sessionId: string; history: unknown[]; uiMessages: unknown[] };
    const { sessionId, history, uiMessages } = body;
    if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

    await ensureTable();
    await db`
      INSERT INTO chat_sessions (session_id, history, ui_messages, updated_at)
      VALUES (${sessionId}, ${JSON.stringify(history)}, ${JSON.stringify(uiMessages)}, NOW())
      ON CONFLICT (session_id) DO UPDATE
        SET history = EXCLUDED.history,
            ui_messages = EXCLUDED.ui_messages,
            updated_at = NOW()
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[chat-history POST]", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
