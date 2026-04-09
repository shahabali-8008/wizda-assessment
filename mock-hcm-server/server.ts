/**
 * Standalone HTTP mock HCM (second process). Mirrors MockHcmService behavior.
 *
 * Run: `npm run mock-hcm:http` from `api/`
 * Point the API at it: `HCM_BASE_URL=http://127.0.0.1:3099`
 */
import http from 'node:http';
import { URL } from 'node:url';

type Row = { employeeId: string; locationId: string; daysRemaining: number };

const PORT = Number(process.env.MOCK_HCM_PORT ?? 3099);
const store = new Map<string, number>();

function key(employeeId: string, locationId: string): string {
  return `${employeeId}:${locationId}`;
}

function maybeTimeout(): void {
  if (process.env.HCM_SIMULATE_TIMEOUT === 'true') {
    const err = new Error('HCM simulated outage');
    (err as Error & { statusCode?: number }).statusCode = 503;
    throw err;
  }
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c as Buffer));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(
  res: http.ServerResponse,
  status: number,
  body: unknown,
): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  try {
    maybeTimeout();
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);

    if (req.method === 'GET' && url.pathname === '/hcm/balance') {
      const employeeId = url.searchParams.get('employeeId');
      const locationId = url.searchParams.get('locationId');
      if (!employeeId || !locationId) {
        sendJson(res, 400, { error: 'employeeId and locationId required' });
        return;
      }
      const k = key(employeeId, locationId);
      if (!store.has(k)) {
        sendJson(res, 400, {
          error: `unknown dimension (${employeeId}, ${locationId})`,
        });
        return;
      }
      sendJson(res, 200, { daysRemaining: store.get(k)! });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/hcm/deduct') {
      const raw = await readBody(req);
      const body = JSON.parse(raw) as {
        employeeId: string;
        locationId: string;
        days: number;
      };
      if (process.env.HCM_FORCE_REJECT === 'true') {
        sendJson(res, 200, { ok: false, message: 'HCM simulated rejection' });
        return;
      }
      const k = key(body.employeeId, body.locationId);
      const current = store.get(k);
      if (current === undefined) {
        sendJson(res, 200, { ok: false, message: 'Unknown dimension' });
        return;
      }
      if (current < body.days) {
        sendJson(res, 200, { ok: false, message: 'Insufficient balance' });
        return;
      }
      if (process.env.HCM_SILENT_BAD_SUCCESS === 'true') {
        sendJson(res, 200, { ok: true });
        return;
      }
      store.set(k, current - body.days);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/hcm/batch') {
      const raw = await readBody(req);
      const parsed = JSON.parse(raw) as { rows: Row[] };
      for (const r of parsed.rows) {
        store.set(key(r.employeeId, r.locationId), r.daysRemaining);
      }
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
      return;
    }

    res.writeHead(404);
    res.end();
  } catch (e) {
    const status = (e as Error & { statusCode?: number }).statusCode ?? 500;
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(e) }));
  }
});

server.listen(PORT, () => {
  process.stdout.write(
    `Mock HCM HTTP listening on http://127.0.0.1:${PORT}\n`,
  );
});
