import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../schema";
import { readConfig } from "../../config";
const config = await readConfig();
const conn = postgres(config.dbUrl);
export const db = drizzle(conn, { schema });
console.log(`Database connected at URL: ${config.dbUrl}`);
