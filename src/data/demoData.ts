import type { Product } from '../models/types';
import { now, uid } from '../utils/helpers';

const names = [
  ['Latte intero', 'Latticini', 2, 1, '2026-11-03'], ['Uova fresche', 'Uova', 6, 4, '2026-11-08'], ['Yogurt bianco', 'Latticini', 1, 2, '2026-11-02'], ['Mozzarella', 'Latticini', 2, 1, '2026-11-01'], ['Burro', 'Latticini', 1, 1, '2026-11-20'], ['Formaggio', 'Latticini', 0, 1, '2026-11-05'], ['Acqua naturale', 'Bevande', 4, 2], ['Prosciutto cotto', 'Carne e salumi', 1, 1, '2026-11-04'], ['Verdure miste', 'Verdura', 3, 2, '2026-11-06'], ['Frutta di stagione', 'Frutta', 2, 2, '2026-11-07']
] as const;

export function createDemoProducts(): Product[] {
  const timestamp = now();
  return names.map(([name, category, quantity, minQuantity, expiryDate], index) => ({
    id: `demo_${index + 1}`, name, category: category as Product['category'], quantity, unit: name.includes('Acqua') ? 'bottiglie' : name.includes('Latte') ? 'bottiglie' : 'pezzi', minQuantity, targetQuantity: minQuantity + 2, expiryDate, lots: [{ id: uid('demo_lot'), quantity, expiryDate, createdAt: timestamp }], createdAt: timestamp, updatedAt: timestamp
  }));
}

export const demoProductColor = (product: Product) => {
  const palette = ['#dff1e9', '#fff0d2', '#fce3df', '#e3e8f9'];
  return palette[product.id.length % palette.length];
};
