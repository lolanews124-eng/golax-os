import { env } from "./config/env.js";
import { createApp } from "./app.js";

const app = createApp();

const server = app.listen(env.API_PORT, () => {
  console.log(
    `[golax-api] listening on http://localhost:${env.API_PORT} (${env.NODE_ENV})`,
  );
});

const shutdown = (signal: string) => {
  console.log(`\n[golax-api] received ${signal}, shutting down...`);
  server.close(() => process.exit(0));
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
