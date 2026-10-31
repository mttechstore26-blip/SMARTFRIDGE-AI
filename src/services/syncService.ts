import { createBackup, restoreBackup, validateBackup } from './backupService';

const KEY = 'smartfridge-sync-config';
export type SyncConfig = { endpoint: string; token: string; revision: number };
export function getSyncConfig(): SyncConfig | null {
  try { const value = sessionStorage.getItem(KEY); return value ? JSON.parse(value) as SyncConfig : null; } catch { return null; }
}
export function configureSync(endpoint: string, token: string) {
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || !token.trim()) throw new Error('Serve un indirizzo HTTPS e una chiave di accesso.');
  const config: SyncConfig = { endpoint: url.origin + url.pathname.replace(/\/$/, ''), token: token.trim(), revision: 0 };
  sessionStorage.setItem(KEY, JSON.stringify(config));
}
async function request(config: SyncConfig, method: 'GET' | 'PUT', body?: unknown) {
  const response = await fetch(config.endpoint + '/api/snapshot', {
    method,
    headers: { Authorization: 'Bearer ' + config.token, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store'
  });
  const data = await response.json();
  if (!response.ok) throw new Error(response.status === 409 ? 'Conflitto: altri dispositivi hanno modificato i dati. Nessun dato sovrascritto.' : 'Sincronizzazione non riuscita (' + response.status + ').');
  return data;
}
/** Explicit push: refuses to overwrite a newer cloud revision. */
export async function uploadSnapshot() {
  const config = getSyncConfig();
  if (!config) throw new Error('Configura prima la sincronizzazione.');
  const remote = await request(config, 'GET');
  if (remote.revision !== config.revision) throw new Error('Il server contiene una versione diversa. Scarica prima un backup e verifica i dati.');
  const result = await request(config, 'PUT', { revision: config.revision, payload: await createBackup() });
  sessionStorage.setItem(KEY, JSON.stringify({ ...config, revision: result.revision }));
}
/** Explicit download: caller must confirm before replacing local inventory. */
export async function downloadSnapshot() {
  const config = getSyncConfig();
  if (!config) throw new Error('Configura prima la sincronizzazione.');
  const remote = await request(config, 'GET');
  if (!remote.payload || !validateBackup(remote.payload)) throw new Error('Il server non contiene ancora un backup valido.');
  await restoreBackup(remote.payload);
  sessionStorage.setItem(KEY, JSON.stringify({ ...config, revision: remote.revision }));
}
