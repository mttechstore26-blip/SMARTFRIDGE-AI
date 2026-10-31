import { beforeEach, describe, expect, it } from 'vitest';
import { db, ensureSettings } from '../src/database/db';
import { createBackup, restoreBackup, validateBackup } from '../src/services/backupService';
import { createProduct } from '../src/services/inventoryService';

beforeEach(async () => { await db.products.clear(); await db.movements.clear(); await db.shopping.clear(); await db.settings.clear(); });

describe('backup locale', () => {
  it('crea un backup versionato completo', async () => {
    await ensureSettings();
    await createProduct({ name: 'Uova', category: 'Uova', quantity: 6, unit: 'pezzi', minQuantity: 2, targetQuantity: 10 });
    const backup = await createBackup();
    expect(validateBackup(backup)).toBe(true);
    expect(backup.products[0].name).toBe('Uova');
  });
  it('rifiuta payload incompleti e ripristina dati validi', async () => {
    expect(validateBackup({ version: 2 })).toBe(false);
    expect(validateBackup({ version: 1, products: [{ id: 'p', name: '', quantity: -1, lots: [] }], movements: [], shopping: [], settings: { id: 'settings' } })).toBe(false);
    const valid = { version: 1 as const, exportedAt: new Date().toISOString(), products: [], movements: [], shopping: [], settings: { id: 'settings' as const, theme: 'chiaro' as const, standbySeconds: 30, expiryNoticeDays: 3 as const, voiceEnabled: true } };
    await restoreBackup(valid);
    expect(await db.products.count()).toBe(0);
    expect((await db.settings.get('settings'))?.theme).toBe('chiaro');
  });
});
