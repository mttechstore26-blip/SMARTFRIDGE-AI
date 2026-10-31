import Dexie, { type Table } from 'dexie';
import type { Movement, Product, Settings, ShoppingItem } from '../models/types';
import { DEFAULT_SETTINGS } from '../models/types';

export class SmartFridgeDB extends Dexie {
  products!: Table<Product, string>;
  movements!: Table<Movement, string>;
  shopping!: Table<ShoppingItem, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super('smartfridge-ai');
    this.version(1).stores({
      products: 'id, barcode, category, updatedAt',
      movements: 'id, productId, timestamp',
      shopping: 'id, productId, purchased',
      settings: 'id'
    });
    this.version(2).stores({
      products: 'id, &barcode, category, updatedAt',
      movements: 'id, productId, timestamp',
      shopping: 'id, productId, purchased',
      settings: 'id'
    });
  }
}

export const db = new SmartFridgeDB();

export async function ensureSettings(): Promise<Settings> {
  const existing = await db.settings.get('settings');
  if (existing) return existing;
  await db.settings.put(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}
