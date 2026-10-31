import { db } from '../database/db';
import type { Category, Lot, Movement, MovementMethod, Product, Unit } from '../models/types';
import { now, uid } from '../utils/helpers';

export type ProductDraft = {
  barcode?: string;
  name: string;
  brand?: string;
  category: Category;
  image?: string;
  quantity: number;
  unit: Unit;
  minQuantity: number;
  targetQuantity: number;
  expiryDate?: string;
  notes?: string;
};

type LotChange = NonNullable<Movement['lotChanges']>[number];
const normalizeBarcode = (barcode?: string) => barcode?.replace(/\s/g, '').trim() || undefined;
const normalizeLots = (lots: Lot[]) => lots.filter((lot) => lot.quantity > 0);
const sumLots = (lots: Lot[]) => lots.reduce((sum, lot) => sum + lot.quantity, 0);
const earliestExpiry = (lots: Lot[]) => lots.filter((lot) => lot.expiryDate).sort((a, b) => (a.expiryDate ?? '').localeCompare(b.expiryDate ?? ''))[0]?.expiryDate;

function validateDraft(draft: ProductDraft) {
  if (!draft.name.trim()) throw new Error('Inserisci il nome del prodotto.');
  if (draft.quantity < 0 || draft.minQuantity < 0 || draft.targetQuantity < 0) throw new Error('Le quantità non possono essere negative.');
  if (draft.barcode && !/^\d{8,14}$/.test(draft.barcode.replace(/\s/g, ''))) throw new Error('Il codice deve contenere da 8 a 14 cifre.');
}

async function assertBarcodeAvailable(barcode: string | undefined, excludeId?: string) {
  if (!barcode) return;
  const duplicate = await db.products.where('barcode').equals(barcode).first();
  if (duplicate && duplicate.id !== excludeId) throw new Error('Questo codice a barre è già associato a un prodotto.');
}

function seedLots(product: Product): Lot[] {
  return product.lots.length ? product.lots.map((lot) => ({ ...lot })) : product.quantity > 0 ? [{ id: uid('lot'), quantity: product.quantity, expiryDate: product.expiryDate, createdAt: product.createdAt }] : [];
}

function removeFromLots(lots: Lot[], amount: number): LotChange[] {
  let remaining = amount;
  const changes: LotChange[] = [];
  for (const lot of [...lots].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    if (remaining <= 0) break;
    const removed = Math.min(lot.quantity, remaining);
    if (removed > 0) { lot.quantity -= removed; remaining -= removed; changes.push({ lotId: lot.id, quantity: removed, expiryDate: lot.expiryDate, action: 'remove' }); }
  }
  if (remaining > 0) throw new Error('Quantità insufficiente: l’inventario non può diventare negativo.');
  return changes;
}

// Keep the per-product movement order unambiguous even when two actions occur in the same millisecond.
async function movementTimestamp(productId: string): Promise<string> {
  const timestamps = (await db.movements.where('productId').equals(productId).toArray()).map((entry) => Date.parse(entry.timestamp)).filter(Number.isFinite);
  const mostRecent = timestamps.length ? Math.max(...timestamps) : 0;
  return new Date(Math.max(Date.now(), mostRecent + 1)).toISOString();
}

function reverseLotChanges(lots: Lot[], changes: LotChange[], timestamp: string) {
  for (const change of changes) {
    const lot = lots.find((item) => item.id === change.lotId);
    if (change.action === 'add') {
      if (lot) lot.quantity = Math.max(0, lot.quantity - change.quantity);
    } else if (lot) {
      lot.quantity += change.quantity;
    } else {
      lots.push({ id: change.lotId, quantity: change.quantity, expiryDate: change.expiryDate, createdAt: timestamp });
    }
  }
}

export async function createProduct(draft: ProductDraft): Promise<Product> {
  const clean = { ...draft, barcode: normalizeBarcode(draft.barcode) };
  validateDraft(clean); await assertBarcodeAvailable(clean.barcode);
  const timestamp = now();
  const lot: Lot | undefined = clean.quantity > 0 ? { id: uid('lot'), quantity: clean.quantity, expiryDate: clean.expiryDate, createdAt: timestamp } : undefined;
  const product: Product = { ...clean, id: uid('product'), lots: lot ? [lot] : [], createdAt: timestamp, updatedAt: timestamp };
  await db.transaction('rw', db.products, db.movements, async () => {
    await db.products.add(product);
    if (lot) await db.movements.add({ id: uid('movement'), productId: product.id, productName: product.name, type: 'creazione', quantity: product.quantity, method: 'manuale', timestamp, previousQuantity: 0, nextQuantity: product.quantity, lotChanges: [{ lotId: lot.id, quantity: lot.quantity, expiryDate: lot.expiryDate, action: 'add' }] });
  });
  return product;
}

export async function updateProduct(id: string, changes: Partial<ProductDraft>): Promise<Product> {
  const current = await db.products.get(id);
  if (!current) throw new Error('Prodotto non trovato.');
  const next = { ...current, ...changes, barcode: normalizeBarcode(changes.barcode ?? current.barcode) };
  validateDraft(next); await assertBarcodeAvailable(next.barcode, id);
  return db.transaction('rw', db.products, db.movements, async () => {
    const timestamp = await movementTimestamp(id);
    const lots = seedLots(current);
    const lotChanges: LotChange[] = [];
    const delta = next.quantity - current.quantity;
    if (delta > 0) { const lot = { id: uid('lot'), quantity: delta, expiryDate: next.expiryDate, createdAt: timestamp }; lots.push(lot); lotChanges.push({ lotId: lot.id, quantity: delta, expiryDate: lot.expiryDate, action: 'add' }); }
    if (delta < 0) lotChanges.push(...removeFromLots(lots, Math.abs(delta)));
    if (changes.expiryDate !== undefined && changes.expiryDate !== current.expiryDate) for (const lot of lots) lot.expiryDate = next.expiryDate;
    const updated: Product = { ...next, quantity: sumLots(normalizeLots(lots)), lots: normalizeLots(lots), expiryDate: earliestExpiry(lots) ?? next.expiryDate, updatedAt: timestamp };
    await db.products.put(updated);
    if (delta !== 0 || changes.expiryDate !== undefined) await db.movements.add({ id: uid('movement'), productId: id, productName: updated.name, type: 'modifica', quantity: Math.abs(delta), method: 'manuale', timestamp, previousQuantity: current.quantity, nextQuantity: updated.quantity, lotChanges });
    return updated;
  });
}

export async function deleteProduct(id: string) {
  await db.transaction('rw', db.products, db.shopping, async () => { await db.products.delete(id); await db.shopping.where('productId').equals(id).delete(); });
}

export async function adjustQuantity(id: string, delta: number, method: MovementMethod): Promise<{ product: Product; movement: Movement }> {
  if (!Number.isFinite(delta) || delta === 0) throw new Error('La variazione deve essere diversa da zero.');
  return db.transaction('rw', db.products, db.movements, async () => {
    const current = await db.products.get(id); if (!current) throw new Error('Prodotto non trovato.');
    const timestamp = await movementTimestamp(id); const lots = seedLots(current); const lotChanges: LotChange[] = [];
    if (delta > 0) { const lot = { id: uid('lot'), quantity: delta, expiryDate: current.expiryDate, createdAt: timestamp }; lots.push(lot); lotChanges.push({ lotId: lot.id, quantity: delta, expiryDate: lot.expiryDate, action: 'add' }); }
    if (delta < 0) lotChanges.push(...removeFromLots(lots, Math.abs(delta)));
    const updated: Product = { ...current, quantity: sumLots(normalizeLots(lots)), lots: normalizeLots(lots), expiryDate: earliestExpiry(lots) ?? current.expiryDate, updatedAt: timestamp };
    const movement: Movement = { id: uid('movement'), productId: id, productName: current.name, type: delta > 0 ? 'entrata' : 'uscita', quantity: Math.abs(delta), method, timestamp, previousQuantity: current.quantity, nextQuantity: updated.quantity, lotChanges };
    await db.products.put(updated); await db.movements.add(movement); return { product: updated, movement };
  });
}

export async function undoMovement(movementId: string): Promise<Product> {
  return db.transaction('rw', db.products, db.movements, async () => {
    const movement = await db.movements.get(movementId);
    if (!movement || movement.undone || movement.previousQuantity === undefined) throw new Error('Operazione non annullabile.');
    const product = await db.products.get(movement.productId); if (!product) throw new Error('Prodotto non trovato.');
    const history = (await db.movements.where('productId').equals(product.id).toArray()).filter((item) => !item.undone && item.type !== 'annullamento').sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    if (history[0]?.id !== movement.id) throw new Error('Puoi annullare solo l’ultimo movimento del prodotto.');
    const timestamp = await movementTimestamp(product.id); const lots = seedLots(product); if (movement.lotChanges) reverseLotChanges(lots, movement.lotChanges, timestamp);
    const restored: Product = { ...product, quantity: movement.previousQuantity, lots: normalizeLots(lots), expiryDate: earliestExpiry(lots) ?? product.expiryDate, updatedAt: timestamp };
    await db.products.put(restored); await db.movements.update(movementId, { undone: true });
    await db.movements.add({ id: uid('movement'), productId: product.id, productName: product.name, type: 'annullamento', quantity: movement.quantity, method: 'manuale', timestamp, previousQuantity: product.quantity, nextQuantity: restored.quantity });
    return restored;
  });
}

export async function getProducts() { return db.products.orderBy('updatedAt').reverse().toArray(); }
export async function getMovements() { return db.movements.orderBy('timestamp').reverse().toArray(); }
