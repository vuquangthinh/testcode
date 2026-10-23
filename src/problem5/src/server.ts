import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createApp } from './app.js';
import { openDatabase } from './database.js';

const portText = process.env.PORT ?? '3000';
if (!/^\d+$/.test(portText) || Number(portText) < 1 || Number(portText) > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}
const path = resolve(process.env.DATABASE_PATH ?? './data/resources.sqlite');
mkdirSync(dirname(path), { recursive: true });
const db = openDatabase(path);
const host = process.env.HOST ?? '127.0.0.1';
const server = createApp(db).listen(Number(portText), host, () => {
  console.log(`Resource API listening at http://${host}:${portText}`);
});
server.on('error', error => {
  console.error('Server failed to start', error);
  db.close();
  process.exitCode = 1;
});
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  const deadline = setTimeout(() => { server.closeAllConnections(); }, 5000);
  deadline.unref();
  server.close(() => { clearTimeout(deadline); db.close(); });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
