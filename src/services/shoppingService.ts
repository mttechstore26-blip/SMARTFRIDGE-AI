import { db } from '../database/db';
import type { Product, ShoppingItem } from '../models/types';
import { normalize, now, uid } from '../utils/helpers';

export function getAutomaticSuggestions(products: Product[]): ShoppingItem[] {
  return products.filter((product) => product.quantity <= product.minQuantity && product.targetQuantity > product.quantity).map((product) => ({
    id: `auto_${product.id}`,
    productId: product.id,
    name: product.name,
    quantity: product.targetQuantity - product.quantity,
    unit: product.unit,
    source: 'automatico',
    purchased: false,
    createdAt: product.updatedAt
  }));
}

export async function getShoppingItems() { return db.shopping.orderBy('createdAt').reverse().toArray(); }
export async function addShoppingItem(name: string, quantity: number, unit: ShoppingItem['unit'] = 'pezzi') {
  const trimmed = name.trim();
  if (!trimmed || quantity <= 0) throw new Error('Inserisci un articolo e una quantità valida.');
  const existing = (await db.shopping.toArray()).find((item) => normalize(item.name) === normalize(trimmed) && !item.purchased);
  if (existing) {
    await db.shopping.update(existing.id, { quantity: existing.quantity + quantity });
    return { ...existing, quantity: existing.quantity + quantity };
  }
  const item: ShoppingItem = { id: uid('shopping'), name: trimmed, quantity, unit, source: 'manuale', purchased: false, createdAt: now() };
  await db.shopping.add(item);
  return item;
}
export async function toggleShoppingItem(item: ShoppingItem) { const updated = { ...item, purchased: !item.purchased }; await db.shopping.put(updated); return updated; }
export async function deleteShoppingItem(id: string) { await db.shopping.delete(id); }
