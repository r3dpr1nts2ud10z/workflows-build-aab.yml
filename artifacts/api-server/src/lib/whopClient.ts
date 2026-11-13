import Whop from '@whop/sdk';

// Whop is reached through the Replit connectors proxy (connection: conn_whop).
// This connection does not expose a raw api_key via the connection-secrets
// endpoint; instead the proxy injects Whop authentication itself. We point the
// SDK's baseURL at the proxy and attach the Replit identity headers on every
// request via a custom fetch (the token is recomputed per call so it never goes
// stale). See the `whop` / `integrations` blueprints.

function replitToken(): string | null {
  return process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;
}

let client: Whop | null = null;

function initWhopClient(): Whop {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;

  if (!hostname) {
    throw new Error(
      'Missing REPLIT_CONNECTORS_HOSTNAME. ' +
      'Ensure the Whop integration is connected via the Integrations tab.'
    );
  }

  const proxyFetch: typeof fetch = async (input, init = {}) => {
    const token = replitToken();
    if (!token) {
      throw new Error(
        'Missing Replit identity token — cannot reach the Whop connector proxy.'
      );
    }
    const headers = new Headers(init.headers);
    // The proxy injects the real Whop credential; strip any SDK-supplied auth.
    headers.delete('authorization');
    headers.set('X-Replit-Token', token);
    headers.set('Connector-Name', 'whop');
    return fetch(input, {
      ...init,
      headers,
      signal: init.signal ?? AbortSignal.timeout(15_000),
    });
  };

  return new Whop({
    // Unused — the connector proxy supplies the real Whop API key.
    apiKey: 'replit-connector-proxy',
    baseURL: `https://${hostname}/api/v2/proxy/api/v1`,
    fetch: proxyFetch,
  });
}

export function getWhopClient(): Promise<Whop> {
  if (!client) {
    client = initWhopClient();
  }
  return Promise.resolve(client);
}
