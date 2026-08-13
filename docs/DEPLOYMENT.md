# Deployment

Run `npm run check`, `npm run platform:check`, and `npm run platform:deploy:dry`. Deploy only after reviewing the output with `npm run platform:deploy`. Production secrets are entered interactively with Wrangler and never committed.

The temporary production URL is `https://fouad-cli-platform.fouadzulof26.workers.dev`. A custom domain requires an explicit domain choice and a conflict check before adding a route.
