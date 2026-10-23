import express, { type ErrorRequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import type { DatabaseSync, SQLInputValue } from 'node:sqlite';

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
type ResourceInput = { name: string; description: string; status: 'active' | 'archived' };
const columns = 'id, name, description, status, created_at AS createdAt, updated_at AS updatedAt';

function validateBody(body: unknown, partial: boolean): Partial<ResourceInput> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Body must be an object');
  const input = body as Record<string, unknown>;
  const keys = Object.keys(input);
  if (keys.some(key => !['name', 'description', 'status'].includes(key))) throw new HttpError(400, 'Unknown body field');
  if (partial && keys.length === 0) throw new HttpError(400, 'Provide at least one field');
  const result: Partial<ResourceInput> = {};
  if (!partial || 'name' in input) {
    if (typeof input.name !== 'string' || input.name.trim().length < 1 || input.name.trim().length > 120) {
      throw new HttpError(400, 'name must contain 1–120 characters');
    }
    result.name = input.name.trim();
  }
  if ('description' in input) {
    if (typeof input.description !== 'string' || input.description.length > 2000) throw new HttpError(400, 'description must be a string of at most 2000 characters');
    result.description = input.description;
  }
  if ('status' in input) {
    if (input.status !== 'active' && input.status !== 'archived') throw new HttpError(400, 'status must be active or archived');
    result.status = input.status;
  }
  return result;
}

function pageInteger(value: unknown, fallback: number, min: number, max: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new HttpError(400, 'Invalid pagination');
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) throw new HttpError(400, 'Pagination out of range');
  return parsed;
}

export function createApp(db: DatabaseSync) {
  const app = express();
  app.disable('x-powered-by');
  app.set('query parser', 'simple');
  app.use(express.json({ limit: '16kb' }));
  app.use('/resources', (req, _res, next) => {
    if (['POST', 'PATCH'].includes(req.method) && !req.is('application/json')) {
      next(new HttpError(415, 'Use Content-Type: application/json'));
      return;
    }
    next();
  });
  app.param('id', (_req, _res, next, id: string) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      next(new HttpError(400, 'Invalid resource UUID'));
      return;
    }
    next();
  });
  const find = (id: string) => db.prepare(`SELECT ${columns} FROM resources WHERE id = ?`).get(id);

  app.post('/resources', (req, res) => {
    const body = validateBody(req.body, false);
    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO resources (id, name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, body.name!, body.description ?? '', body.status ?? 'active', now, now);
    res.status(201).location(`/resources/${id}`).json({ data: find(id) });
  });

  app.get('/resources', (req, res) => {
    if (Object.keys(req.query).some(key => !['q', 'status', 'limit', 'offset'].includes(key))) throw new HttpError(400, 'Unknown query parameter');
    const limit = pageInteger(req.query.limit, 20, 1, 100);
    const offset = pageInteger(req.query.offset, 0, 0, 1_000_000);
    const clauses: string[] = [];
    const parameters: SQLInputValue[] = [];
    if (req.query.status !== undefined) {
      if (req.query.status !== 'active' && req.query.status !== 'archived') throw new HttpError(400, 'Invalid status filter');
      clauses.push('status = ?');
      parameters.push(req.query.status);
    }
    if (req.query.q !== undefined) {
      if (typeof req.query.q !== 'string' || req.query.q.length > 120) throw new HttpError(400, 'q must be a string of at most 120 characters');
      // instr treats %, _ and SQL punctuation as literal text, not patterns/code.
      clauses.push('instr(lower(name), lower(?)) > 0');
      parameters.push(req.query.q.trim());
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const data = db.prepare(`SELECT ${columns} FROM resources ${where} ORDER BY created_at DESC, id ASC LIMIT ? OFFSET ?`).all(...parameters, limit, offset);
    const count = db.prepare(`SELECT count(*) AS total FROM resources ${where}`).get(...parameters)!;
    res.json({ data, pagination: { limit, offset, total: count.total } });
  });

  app.get('/resources/:id', (req, res) => {
    const resource = find(req.params.id);
    if (!resource) throw new HttpError(404, 'Resource not found');
    res.json({ data: resource });
  });

  app.patch('/resources/:id', (req, res) => {
    const body = validateBody(req.body, true);
    const fields = Object.entries(body);
    // Column names originate only from validateBody's fixed allowlist.
    const assignments = fields.map(([key]) => `${key} = ?`).join(', ');
    const values: SQLInputValue[] = fields.map(([, value]) => value);
    const result = db.prepare(`UPDATE resources SET ${assignments}, updated_at = ? WHERE id = ?`)
      .run(...values, new Date().toISOString(), req.params.id);
    if (Number(result.changes) === 0) throw new HttpError(404, 'Resource not found');
    res.json({ data: find(req.params.id) });
  });

  app.delete('/resources/:id', (req, res) => {
    const result = db.prepare('DELETE FROM resources WHERE id = ?').run(req.params.id);
    if (Number(result.changes) === 0) throw new HttpError(404, 'Resource not found');
    res.status(204).end();
  });

  app.use((_req, _res, next) => next(new HttpError(404, 'Route not found')));
  const errors: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: { message: error.message } });
      return;
    }
    const type = (error as { type?: string } | null)?.type;
    if (type === 'entity.parse.failed') {
      res.status(400).json({ error: { message: 'Malformed JSON' } });
      return;
    }
    if (type === 'entity.too.large') {
      res.status(413).json({ error: { message: 'Body exceeds 16kb' } });
      return;
    }
    if (type === 'charset.unsupported' || type === 'encoding.unsupported') {
      res.status(415).json({ error: { message: 'Unsupported body encoding' } });
      return;
    }
    console.error('Resource request failed', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  };
  app.use(errors);
  return app;
}
