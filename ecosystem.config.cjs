// PM2 process config for VPS deployment.
// Usage (from repo root):
//   pnpm install
//   pnpm db:migrate:deploy   (run once / on schema changes)
//   pnpm --filter @golax/worker browser:install
//   pnpm --filter @golax/web build
//   pm2 start ecosystem.config.cjs

module.exports = {
  apps: [
    {
      name: "golax-api",
      script: "pnpm",
      args: "--filter @golax/api start",
      interpreter: "none",
      cwd: __dirname,
      env: { NODE_ENV: "production" },
      max_restarts: 10,
      restart_delay: 3000,
    },
    {
      name: "golax-worker",
      script: "pnpm",
      args: "--filter @golax/worker start",
      interpreter: "none",
      cwd: __dirname,
      env: { NODE_ENV: "production" },
      max_restarts: 10,
      restart_delay: 5000,
    },
    {
      name: "golax-web",
      script: "pnpm",
      args: "--filter @golax/web start",
      interpreter: "none",
      cwd: __dirname,
      env: { NODE_ENV: "production" },
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
