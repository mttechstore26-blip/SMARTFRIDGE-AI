import { db } from '../database/db';
import { CATEGORIES, UNITS, type BackupPayload, type Product, type Settings } from '../models/types';
import { toCsv } from '../utils/helpers';

export async function createBackup(): Promise<BackupPayload> {
  return db.transaction('r', db.products, db.movements, db.shopping, db.settings, async () => {
    const [products, movements, shopping, settings] = await Promise.all([db.products.toArray(), db.movements.toArray(), db.shopping.toArray(), db.settings.get('settings')]);
    return { version: 1, exportedAt: new Date().toISOString(), products, movements, shopping, settings: settings as Settings };
  });
}

function validProduct(value: unknown): value is Product {
  if (!value || typeof value !== 'object') return false;
  const product = value as Partial<Product>;
  const lots = Array.isArray(product.lots) ? product.lots : [];
  const lotTotal = lots.reduce((sum, lot) => sum + (typeof lot?.quantity === 'number' ? lot.quantity : NaN), 0);
  return typeof product.id === 'string' && typeof product.name === 'string' && product.name.trim().length > 0 && typeof product.quantity === 'number' && product.quantity >= 0 && Number.isFinite(product.quantity) && Math.abs(lotTotal - product.quantity) < 0.001 && typeof product.minQuantity === 'number' && product.minQuantity >= 0 && typeof product.targetQuantity === 'number' && product.targetQuantity >= 0 && UNITS.includes(product.unit as (typeof UNITS)[number]) && CATEGORIES.includes(product.category as (typeof CATEGORIES)[number]) && typeof product.createdAt === 'string' && typeof product.updatedAt === 'string' && (!product.barcode || /^\d{8,14}$/.test(product.barcode));
}

function validSettings(value: unknown): value is Settings {
  if (!value || typeof value !== 'object') return false;
  const settings = value as Partial<Settings>;
  return settings.id === 'settings' && ['chiaro', 'scuro', 'sistema'].includes(settings.theme ?? '') && [0, 30, 60, 120].includes(settings.standbySeconds ?? -1) && [1, 3, 7].includes(settings.expiryNoticeDays ?? -1) && typeof settings.voiceEnabled === 'boolean';
}

export function validateBackup(value: unknown): value is BackupPayload {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<BackupPayload>;
  if (data.version !== 1 || !Array.isArray(data.products) || !Array.isArray(data.movements) || !Array.isArray(data.shopping) || !validSettings(data.settings)) return false;
  if (!data.products.every(validProduct)) return false;
  const barcodes = data.products.map((product) => product.barcode).filter(Boolean);
  if (new Set(barcodes).size !== barcodes.length) return false;
  return data.movements.every((movement) => typeof movement.id === 'string' && typeof movement.productId === 'string' && typeof movement.productName === 'string' && typeof movement.quantity === 'number' && movement.quantity >= 0 && typeof movement.timestamp === 'string') && data.shopping.every((item) => typeof item.id === 'string' && typeof item.name === 'string' && typeof item.quantity === 'number' && item.quantity > 0 && UNITS.includes(item.unit));
}

export async function restoreBackup(payload: BackupPayload) {
  if (!validateBackup(payload)) throw new Error('Backup non valido o non compatibile.');
  await db.transaction('rw', db.products, db.movements, db.shopping, db.settings, async () => {
    await db.products.clear(); await db.movements.clear(); await db.shopping.clear();
    await db.products.bulkPut(payload.products); await db.movements.bulkPut(payload.movements); await db.shopping.bulkPut(payload.shopping); await db.settings.put(payload.settings);
  });
}

export async function createInventoryCsv(products: Product[]) {
  return toCsv(products.map((product) => ({ nome: product.name, marca: product.brand ?? '', categoria: product.category, quantita: product.quantity, unita: product.unit, minimo: product.minQuantity, obiettivo: product.targetQuantity, scadenza: product.expiryDate ?? '', barcode: product.barcode ?? '' })));
}

export function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}
