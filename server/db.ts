import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import * as schema from "../shared/schema";

// Configure WebSocket for Neon (skip in Vercel serverless)
if (process.env.VERCEL !== '1') {
  import('ws').then(ws => {
    neonConfig.webSocketConstructor = ws.default;
  });
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Disable prepared statements for Vercel serverless
  allowExitOnIdle: true
});

export const db = drizzle(pool, { schema });
