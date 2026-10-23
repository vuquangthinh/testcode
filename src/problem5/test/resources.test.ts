import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/database.js';

test('CRUD, filters, validation and persistence', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'resources-test-'));
  const path = join(directory, 'test.sqlite');
  const db = openDatabase(path);
  const server = createApp(db).listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const request = (route: string, method = 'GET', body?: unknown) => fetch(base + route, {
    method, headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  try {
    const created = await request('/resources', 'POST', { name: '  Demo  ', description: 'persist me' });
    assert.equal(created.status, 201);
    const { data } = await created.json();
    assert.equal(data.name, 'Demo');
    assert.equal(data.status, 'active');
    assert.equal(created.headers.get('location'), `/resources/${data.id}`);
    assert.equal((await request(`/resources/${data.id}`)).status, 200);
    const filtered = await (await request('/resources?q=demo&status=active&limit=1')).json();
    assert.equal(filtered.data.length, 1);
    assert.equal(filtered.pagination.total, 1);
    assert.equal((await (await request('/resources?q=%27%20OR%201%3D1--')).json()).data.length, 0);
    const updated = await request(`/resources/${data.id}`, 'PATCH', { status: 'archived' });
    assert.equal(updated.status, 200);
    assert.equal((await updated.json()).data.description, 'persist me');
    assert.equal((await (await request('/resources?status=active')).json()).data.length, 0);

    for (const body of [{}, { name: ' ' }, { name: 3 }, { name: 'a', status: 'bad' }, { name: 'a', id: 'forged' }]) {
      assert.equal((await request('/resources', 'POST', body)).status, 400);
    }
    assert.equal((await request(`/resources/${data.id}`, 'PATCH', {})).status, 400);
    for (const query of ['limit=-1', 'limit=101', 'offset=1.5', 'status=bad', 'q=a&q=b', 'unknown=1']) {
      assert.equal((await request(`/resources?${query}`)).status, 400);
    }
    assert.equal((await request('/resources/not-a-uuid')).status, 400);
    assert.equal((await fetch(base + '/resources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
    assert.equal((await fetch(base + '/resources', { method: 'POST', body: 'plain text' })).status, 415);
    assert.equal((await request('/resources', 'POST', { name: 'x'.repeat(20_000) })).status, 413);

    // Independently reopening the database proves committed changes survive a connection.
    const reopened = openDatabase(path);
    try { assert.equal(reopened.prepare('SELECT status FROM resources WHERE id = ?').get(data.id)?.status, 'archived'); }
    finally { reopened.close(); }
    assert.equal((await request(`/resources/${data.id}`, 'DELETE')).status, 204);
    assert.equal((await request(`/resources/${data.id}`)).status, 404);
    assert.equal((await request(`/resources/${data.id}`, 'PATCH', { name: 'gone' })).status, 404);
    assert.equal((await request(`/resources/${data.id}`, 'DELETE')).status, 404);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
