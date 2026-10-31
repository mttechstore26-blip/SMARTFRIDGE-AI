import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/database/db';
import { adjustQuantity, createProduct, undoMovement } from '../src/services/inventoryService';

const draft = { name: 'Latte', category: 'Latticini' as const, quantity: 2, unit: 'bottiglie' as const, minQuantity: 1, targetQuantity: 3 };

beforeEach(async () => { await db.products.clear(); await db.movements.clear(); await db.shopping.clear(); await db.settings.clear(); });

describe('inventario locale', () => {
  it('crea un prodotto e registra la creazione nello storico', async () => {
    const product = await createProduct({ ...draft, barcode: '8001234567890' });
    expect(product.quantity).toBe(2); expect(product.lots).toHaveLength(1); expect(await db.movements.count()).toBe(1);
  });
  it('rifiuta barcode duplicati', async () => {
    await createProduct({ ...draft, barcode: '8001234567890' });
    await expect(createProduct({ ...draft, name: 'Latte 2', barcode: '8001234567890' })).rejects.toThrow('già associato');
  });
  it('gestisce entrata e uscita mantenendo lotti FIFO e quantità non negative', async () => {
    const product = await createProduct({ ...draft, quantity: 1 });
    const entry = await adjustQuantity(product.id, 2, 'touch');
    expect(entry.product.quantity).toBe(3); expect(entry.product.lots).toHaveLength(2);
    const exit = await adjustQuantity(product.id, -2, 'touch');
    expect(exit.product.quantity).toBe(1); expect(exit.product.lots).toHaveLength(1); expect(exit.product.lots[0].quantity).toBe(1);
    await expect(adjustQuantity(product.id, -3, 'touch')).rejects.toThrow('non può diventare negativo');
  });
  it('annulla l’ultimo movimento ripristinando quantità e lotto', async () => {
    const product = await createProduct({ ...draft, quantity: 2 });
    const { movement } = await adjustQuantity(product.id, -1, 'scanner');
    const restored = await undoMovement(movement.id);
    expect(restored.quantity).toBe(2); expect(restored.lots.reduce((sum, lot) => sum + lot.quantity, 0)).toBe(2); expect((await db.movements.get(movement.id))?.undone).toBe(true);
  });
  it('non consente di annullare un movimento superato da un altro', async () => {
    const product = await createProduct({ ...draft, quantity: 2 });
    const first = await adjustQuantity(product.id, -1, 'touch');
    await adjustQuantity(product.id, 1, 'touch');
    await expect(undoMovement(first.movement.id)).rejects.toThrow('solo l’ultimo movimento');
  });
});
