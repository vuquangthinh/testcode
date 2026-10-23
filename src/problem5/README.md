# Resource CRUD API

Express 5 + TypeScript, with a file-backed SQLite database using Node's built-in `node:sqlite`. Resources represent named items with a description and active/archived status. No native third-party database package or external database server is required.

## Setup

Requires Node.js **22.13+**. The SQLite API may emit an experimental warning on Node 22.

```sh
cd src/problem5
npm install
npm run dev
```

For a compiled run: `npm run build` followed by `npm start`. `npm run typecheck` checks application types. `npm test` runs integration tests with a temporary SQLite file and a loopback HTTP server.

| Environment variable | Default | Purpose |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Bind address |
| `PORT` | `3000` | Port, 1–65535 |
| `DATABASE_PATH` | `./data/resources.sqlite` | File location, relative to working directory |

Set variables in the shell; `.env` is not automatically loaded. The parent directory and schema are created at startup. Keep the database file between restarts; it is ignored by Git. SIGINT/SIGTERM stop the HTTP server and close the connection.

## Contract

| Method | Endpoint | Result |
| --- | --- | --- |
| POST | `/resources` | Create, 201 + Location header |
| GET | `/resources?q=demo&status=active&limit=20&offset=0` | Filtered list, 200 |
| GET | `/resources/:id` | Details, 200 |
| PATCH | `/resources/:id` | Partial update, 200 |
| DELETE | `/resources/:id` | Delete, 204 with no body |

Create requires `name` (trimmed, 1–120 characters). Optional `description` is a string up to 2000 characters, default empty. Optional `status` is `active` (default) or `archived`. PATCH accepts at least one of these fields. Nulls, incorrect types, unknown body/query fields and invalid IDs are rejected. UUIDs, creation time and update time are server-assigned and cannot be overwritten.

`q` performs a literal substring match on the name, case-insensitive for ASCII using SQLite's built-in lower(). `status` is an exact filter. Filters combine with AND. `limit` defaults to 20 (1–100), `offset` to 0 (0–1,000,000). Repeated query parameters are rejected. Results sort by creation time descending then ID ascending. Offset pagination can shift under concurrent inserts/deletes.

Example (commands for manual use; not executed during implementation):

```sh
curl -i http://127.0.0.1:3000/resources \
  -H 'Content-Type: application/json' \
  -d '{"name":"Demo item","description":"First resource"}'
curl 'http://127.0.0.1:3000/resources?status=active&limit=10'
# Replace RESOURCE_ID with the returned UUID:
curl http://127.0.0.1:3000/resources/RESOURCE_ID
curl -X PATCH http://127.0.0.1:3000/resources/RESOURCE_ID \
  -H 'Content-Type: application/json' -d '{"status":"archived"}'
curl -X DELETE http://127.0.0.1:3000/resources/RESOURCE_ID
```

Single-resource responses are `{ "data": { "id", "name", "description", "status", "createdAt", "updatedAt" } }` (field names shown schematically). Lists include `data: []` and `pagination: {limit, offset, total}`. Errors use `{ "error": { "message": "..." } }`: 400 invalid input/JSON, 404 missing resource/route, 413 oversized body, 415 unsupported media/encoding, 500 unexpected failure. Internal failures are logged server-side without returning stack traces.

## Design and limitations

Bound SQL parameters prevent user text from becoming SQL. PATCH updates only specified columns in a single statement. Synchronous SQLite is deliberately simple for this small single-process challenge; for high concurrency use an async database service or worker. Last write wins for simultaneous edits to the same field. Production work includes authentication/ownership, rate limiting, migrations, optimistic concurrency, backups and structured logging; this local demo has no authentication and should not be exposed as a public write API.

Verification status: test cases are provided, but dependencies, build and tests have **not** been executed, respecting the request not to run repository code.

References: [Node SQLite](https://nodejs.org/download/release/latest-jod/docs/api/sqlite.html), [Express error handling](https://expressjs.com/en/5x/guide/error-handling/).
