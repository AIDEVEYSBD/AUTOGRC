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

// Postgres client with nice ergonomics
export const db =
  global.__AUTOGRC_DB__ ??
  postgres(DATABASE_URL, {
    ssl: "require",
    max: 1, // important for serverless
    idle_timeout: 20,
    connect_timeout: 10,
  })

if (process.env.NODE_ENV !== "production") {
  global.__AUTOGRC_DB__ = db
}

export { sql }
