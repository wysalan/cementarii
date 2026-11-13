import type { H3Event } from "h3";
import { createDb, type Db } from "../db/client";
import * as tables from "../db/schema";

export function useDb(event: H3Event): Db {
  if (event.context.db) return event.context.db;

  const { HYPERDRIVE } = event.context.cloudflare.env;
  const db = createDb(HYPERDRIVE.connectionString);
  event.context.db = db;
  return db;
}

export { tables };

declare module "h3" {
  interface H3EventContext {
    db?: Db;
  }
}
