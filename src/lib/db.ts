import "server-only"

import { neon } from "@neondatabase/serverless"
import postgres from "postgres"

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set")
}

declare global {
  // eslint-disable-next-line no-var
  var __AUTOGRC_DB__: ReturnType<typeof postgres> | undefined
}

// Neon low-level driver (edge safe)
const sql = neon(DATABASE_URL)

// Postgres client with nice ergonomics.
// NOTE: Neon scales the compute to zero when idle, so the first query after a
// cold start can take several seconds. A short connect_timeout (10s) caused
// intermittent `CONNECT_TIMEOUT` errors — give cold starts generous headroom.
// We connect through Neon's pooler endpoint (-pooler in DATABASE_URL), so a
// small pool is safe even on serverless.
export const db =
  global.__AUTOGRC_DB__ ??
  postgres(DATABASE_URL, {
    ssl: "require",
    max: 5,
    idle_timeout: 30,
    connect_timeout: 30, // allow time for Neon cold starts
    max_lifetime: 60 * 30, // recycle connections every 30 min
  })

if (process.env.NODE_ENV !== "production") {
  global.__AUTOGRC_DB__ = db
}

export { sql }
