import { describe, expect, it } from 'vitest';
import { getDashboardStats, daysUntil, productNeedsShopping, toCsv } from '../src/utils/helpers';
import { getAutomaticSuggestions } from '../src/services/shoppingService';
import { parseCommand } from '../src/voice/voiceParser';
import type { Product } from '../src/models/types';

const product = (overrides: Partial<Product> = {}): Product => ({ id: 'p1', name: 'Latte', category: 'Latticini', quantity: 1, unit: 'bottiglie', minQuantity: 2, targetQuantity: 4, lots: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides });

describe('dominio e voce', () => {
  it('calcola prodotti quasi finiti, esauriti e in scadenza', () => {
    const items = [product(), product({ id: 'p2', name: 'Uova', quantity: 0 }), product({ id: 'p3', name: 'Yogurt', quantity: 3, expiryDate: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10) })];
    const stats = getDashboardStats(items, 3);
    expect(stats.totalProducts).toBe(4);
    expect(stats.lowStock).toBe(1);
    expect(stats.outOfStock).toBe(1);
    expect(stats.expiringSoon).toBe(1);
    expect(productNeedsShopping(items[0])).toBe(true);
    expect(daysUntil(items[2].expiryDate)).toBeLessThanOrEqual(2);
  });
  it('suggerisce la quantità obiettivo senza duplicare la riga prodotto', () => {
    const suggestions = getAutomaticSuggestions([product()]);
    expect(suggestions[0]).toMatchObject({ name: 'Latte', quantity: 3, source: 'automatico' });
  });
  it('interpreta i comandi italiani', () => {
    expect(parseCommand('Ehi Frigo, aggiungi sei yogurt')).toMatchObject({ intent: 'add', product: 'yogurt', quantity: 6 });
    expect(parseCommand('Ho preso due uova')).toMatchObject({ intent: 'remove', product: 'uova', quantity: 2 });
    expect(parseCommand('Quanto latte è rimasto?')).toMatchObject({ intent: 'query', product: 'latte' });
    expect(parseCommand('Cosa devo comprare?')).toEqual({ intent: 'shopping-list' });
    expect(parseCommand('Quali prodotti stanno per scadere?')).toEqual({ intent: 'expiring' });
  });
  it('produce CSV con intestazione e valori quotati', () => {
    const csv = toCsv([{ nome: 'Latte', quantita: 2 }]);
    expect(csv).toContain('nome,quantita');
    expect(csv).toContain('"Latte","2"');
  });
});
