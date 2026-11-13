import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./server/db/schema/*",
  out: "./server/db/migrations",
  casing: "snake_case",
  schemaFilter: ["public"],
  dbCredentials: { url: process.env.DATABASE_URL! },
});
