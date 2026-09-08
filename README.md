# Application Manager

A personal job application tracker built with React, TypeScript, Tailwind, Express, and PostgreSQL.

## Everyday use on Windows

Double-click **Launch Application Manager.cmd**. You can also create a desktop shortcut to this file using Windows Explorer.

The launcher checks PostgreSQL, starts the API and Vite, waits until the page can access the database, then opens http://localhost:5173/ in your default browser. If the PostgreSQL 18 Windows service is stopped, Windows will ask for administrator permission to start just that service.

Keep the launcher window open while using the app. Press Enter in that window when finished; it stops only servers started by that launcher. Closing the browser does not stop the servers. PostgreSQL stays running. Existing app servers are reused and left running. If an older API is running without the launcher health identifier, stop it in its original terminal once before launching.

The launcher uses the development frontend, so frontend edits still reload automatically. Restart the launcher after backend edits. This is a local convenience script, not a packaged installer: Node.js, PostgreSQL, and this project folder are still required.

Logs go into `.run/` (ignored by Git). Port conflicts produce an error rather than stopping another program. Use Enter for a clean shutdown instead of closing the control window with its X button.

## One-time setup

The existing configured installation already has dependencies and `server/.env`. For a fresh checkout:

1. Install Node.js and PostgreSQL 18. The launcher expects Windows service `postgresql-x64-18`.
2. Run `npm ci` in both `client` and `server`.
3. Copy `server/.env.example` to `server/.env` and enter your local database connection settings. Never commit `.env`.
4. Double-click the launcher. It creates the database named in `PGDATABASE` if missing, creates the tables, and applies pending migrations automatically. The configured PostgreSQL user must be allowed to create a database (or use an existing database they own).

No manual SQL commands are required. You can also run setup independently from the `server` folder:

```powershell
npm run db:setup
```

The `schema_migrations` table tracks completed SQL files. Each launch skips completed migrations. Existing installations with the original three manually applied migrations are recognized, preserving their application records. Future schema changes should go in a new numbered file in `server/sql/`; do not edit migrations that have already shipped. Pending migrations and their history are applied together in a transaction, so a failed migration rolls back that batch. A newly created database may remain empty if its first migration fails; the next launch can retry.

The launcher does not install Node.js/PostgreSQL, install npm dependencies, or fill in database credentials. Those remain one-time setup steps above.

To check prerequisites without starting app servers or opening the browser:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Start-ApplicationManager.ps1 -CheckOnly
```
