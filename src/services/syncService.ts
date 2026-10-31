import { createBackup, restoreBackup, validateBackup } from './backupService';
import type { BackupPayload } from '../models/types';

const KEY = 'smartfridge-sync-config';
const AUTO_KEY = 'smartfridge-sync-auto';
const BASELINE_KEY = 'smartfridge-sync-baseline';
export type SyncConfig = { endpoint: string; token: string; revision: number };
export type AutoSyncResult = 'inizializzato' | 'aggiornato' | 'inviato' | 'nessuna-modifica';

let baseline: string | null = null;
function readBaseline(config: SyncConfig): string | null {
  try {
    const saved = JSON.parse(localStorage.getItem(BASELINE_KEY) ?? 'null') as { endpoint: string; value: string } | null;
    return saved?.endpoint === config.endpoint ? saved.value : null;
  } catch { return null; }
}
function storeBaseline(config: SyncConfig, value: string) {
  baseline = value;
  localStorage.setItem(BASELINE_KEY, JSON.stringify({ endpoint: config.endpoint, value }));
}
let busy = false;

function fingerprint(payload: BackupPayload): string {
  // exportedAt changes on every backup; it is not a real data modification.
  return JSON.stringify({ products: payload.products, movements: payload.movements, shopping: payload.shopping, settings: payload.settings });
}

export function getSyncConfig(): SyncConfig | null {
  try {
    const value = sessionStorage.getItem(KEY);
    return value ? JSON.parse(value) as SyncConfig : null;
  } catch { return null; }
}
export function isAutoSyncEnabled(): boolean {
  return localStorage.getItem(AUTO_KEY) === 'yes';
}
export function setAutoSyncEnabled(enabled: boolean) {
  localStorage.setItem(AUTO_KEY, enabled ? 'yes' : 'no');
}
export function configureSync(endpoint: string, token: string) {
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || !token.trim()) throw new Error('Serve un indirizzo HTTPS e una chiave di accesso.');
  const previous = getSyncConfig();
  const normalized = url.origin + url.pathname.replace(/\/$/, '');
  const config: SyncConfig = { endpoint: normalized, token: token.trim(), revision: previous?.endpoint === normalized && previous.token === token.trim() ? previous.revision : 0 };
  sessionStorage.setItem(KEY, JSON.stringify(config));
  baseline = readBaseline(config);
}
async function request(config: SyncConfig, method: 'GET' | 'PUT', body?: unknown) {
  const response = await fetch(config.endpoint + '/api/snapshot', {
    method,
    headers: { Authorization: 'Bearer ' + config.token, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store'
  });
  const data = await response.json();
  if (!response.ok) throw new Error(response.status === 409 ? 'Conflitto: il server è stato modificato da un altro dispositivo. Nessun dato sovrascritto.' : 'Sincronizzazione non riuscita (' + response.status + ').');
  return data as { revision: number; payload?: BackupPayload | null };
}
export async function uploadSnapshot() {
  const config = getSyncConfig();
  if (!config) throw new Error('Configura prima la sincronizzazione.');
  if (busy) throw new Error('Sincronizzazione già in corso.');
  busy = true;
  try {
    const remote = await request(config, 'GET');
    if (remote.revision !== config.revision) throw new Error('Il server contiene una versione diversa. Scarica prima un backup e verifica i dati.');
    const payload = await createBackup();
    const result = await request(config, 'PUT', { revision: config.revision, payload });
    sessionStorage.setItem(KEY, JSON.stringify({ ...config, revision: result.revision }));
    storeBaseline(config, fingerprint(payload));
  } finally { busy = false; }
}
export async function downloadSnapshot() {
  const config = getSyncConfig();
  if (!config) throw new Error('Configura prima la sincronizzazione.');
  if (busy) throw new Error('Sincronizzazione già in corso.');
  busy = true;
  try {
    const remote = await request(config, 'GET');
    if (!remote.payload || !validateBackup(remote.payload)) throw new Error('Il server non contiene ancora un backup valido.');
    await restoreBackup(remote.payload);
    sessionStorage.setItem(KEY, JSON.stringify({ ...config, revision: remote.revision }));
    storeBaseline(config, fingerprint(remote.payload));
  } finally { busy = false; }
}

/**
 * Conservative automatic synchronization:
 * - Never silently replace data when both devices changed it.
 * - Never upload a first-time/unknown local state to an already populated server.
 * - Optimistic revision checks prevent concurrent overwrites.
 * - Works offline locally; when online again, requires manual resolution if both changed.
 */
export async function autoSyncOnce(): Promise<AutoSyncResult> {
  const config = getSyncConfig();
  if (!config || !isAutoSyncEnabled()) return 'nessuna-modifica';
  if (busy) return 'nessuna-modifica';
  busy = true;
  try {
    if (baseline === null) baseline = readBaseline(config);
    const local = await createBackup();
    const localHash = fingerprint(local);
    const remote = await request(config, 'GET');
    if (!remote.payload || !validateBackup(remote.payload)) {
      throw new Error('Il server non ha un inventario valido. Esegui prima l’invio manuale.');
    }
    const remoteHash = fingerprint(remote.payload);
    if (baseline === null) {
      // A fresh tab/session may have unsent local changes: do not guess which is authoritative.
      if (localHash !== remoteHash) {
        throw new Error('Inventari diversi: scegli manualmente Invia o Scarica dopo aver esportato un backup.');
      }
      storeBaseline(config, localHash);
      sessionStorage.setItem(KEY, JSON.stringify({ ...config, revision: remote.revision }));
      return 'inizializzato';
    }
    const localChanged = localHash !== baseline;
    const remoteChanged = remoteHash !== baseline;
    if (localChanged && remoteChanged) {
      throw new Error('Conflitto tra tablet e smartphone: nessun dato sovrascritto. Esporta un backup e risolvi manualmente.');
    }
    if (remoteChanged) {
      if (localChanged) throw new Error('Modifiche concorrenti. Sincronizzazione sospesa.');
      await restoreBackup(remote.payload);
      storeBaseline(config, remoteHash);
      sessionStorage.setItem(KEY, JSON.stringify({ ...config, revision: remote.revision }));
      return 'aggiornato';
    }
    if (localChanged) {
      const result = await request(config, 'PUT', { revision: remote.revision, payload: local });
      storeBaseline(config, localHash);
      sessionStorage.setItem(KEY, JSON.stringify({ ...config, revision: result.revision }));
      return 'inviato';
    }
    if (config.revision !== remote.revision) sessionStorage.setItem(KEY, JSON.stringify({ ...config, revision: remote.revision }));
    return 'nessuna-modifica';
  } finally { busy = false; }
}
