// Load environment variables from .env file in development
// In Docker, environment variables are injected directly
try {
  require("dotenv/config");
} catch {
  // dotenv not available or no .env file, use environment variables directly
}

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});

