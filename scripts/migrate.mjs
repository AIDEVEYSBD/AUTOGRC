// Idempotent DB migration + admin seed for AutoGRC self-hosted auth.
// Usage: node scripts/migrate.mjs
// Reads DATABASE_URL (+ optional SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD/SEED_ADMIN_NAME)
// from the environment or .env.local.

import { neon } from "@neondatabase/serverless";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- load env (.env.local fallback) ----
function loadEnv() {
  try {
    const txt = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {}
}
loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const sql = neon(DATABASE_URL);

// ---- password hashing (must match src/lib/auth.ts) ----
function hashPassword(password) {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

async function run() {
  // 1. Apply migration files in order
  const dir = join(__dirname, "migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const content = readFileSync(join(dir, file), "utf8");
    const statements = content
      .split(";")
      .map((s) => s.replace(/--.*$/gm, "").trim())
      .filter(Boolean);
    for (const stmt of statements) {
      await sql.query(stmt);
    }
    console.log(`✓ applied ${file} (${statements.length} statements)`);
  }

  // 2. Seed an initial admin so login works immediately
  const email = (process.env.SEED_ADMIN_EMAIL || "sbd@autogrc.local").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "WeMakeGoodRAG";
  const name = process.env.SEED_ADMIN_NAME || "SBD Admin";

  const existing = await sql`SELECT id FROM app_users WHERE lower(email) = ${email} LIMIT 1`;
  if (existing.length === 0) {
    await sql`
      INSERT INTO app_users (id, email, name, role, status, password_hash, created_at)
      VALUES (${randomUUID()}, ${email}, ${name}, 'admin', 'active', ${hashPassword(password)}, now())
    `;
    console.log(`✓ seeded admin: ${email}`);
  } else {
    console.log(`• admin already exists: ${email}`);
  }

  console.log("Migration complete.");
}

run().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
