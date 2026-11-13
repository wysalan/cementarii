import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export function createDb(connectionString: string) {
  return drizzle({
    connection: { connectionString, max: 5 },
    schema,
    casing: "snake_case",
  });
}

export type Db = ReturnType<typeof createDb>;
