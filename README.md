# Application Manager

A personal job application tracker built with React, TypeScript, Tailwind, Express, and PostgreSQL.

## Searching and browsing applications

Enter a company, position, or note fragment and press Search (or Enter). Search is case-insensitive and treats `%` and `_` as literal characters. Combine it with a status filter and browse 10, 25, or 50 rows per page. Click Company, Position, Location, Status, Date applied, or Date updated to sort ascending; click the same header again to toggle direction. An arrow marks the active sort. Selecting a different column starts ascending, and sorting returns to page one. Missing dates/locations sort last. Status badge counts always refer to the whole collection; the matching count refers to the active search and status.

The API now returns a page object instead of a bare array. For example, `GET /api/applications?search=engineer&status=Applied&sort=dateApplied&direction=desc&page=1&pageSize=10` returns `items`, `total`, `page`, `pageSize`, `totalPages`, and `counts`. PostgreSQL filters and sorts before applying the page limit. Invalid query parameters return HTTP 400. Pages beyond the final page are clamped, including after a deletion. Restart the backend after updating to this version.

## Automated checks

`.github/workflows/checks.yml` runs on pushes and pull requests, and can be started manually from GitHub's Actions tab once pushed. The frontend job installs dependencies, runs ESLint, and builds the app. The backend job builds TypeScript and runs integration tests using a temporary PostgreSQL 18 service. Its password is a disposable test credential; it does not use your local `.env` or personal application database.

Run the equivalent checks locally with `npm run lint` and `npm run build` in `client`, and `npm run test:db` in `server`. Tests create and remove their own temporary schemas/databases. The workflow reports failures but does not deploy the app or enforce branch protection.

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
