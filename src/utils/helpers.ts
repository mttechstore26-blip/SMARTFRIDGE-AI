import type { Category, DashboardStats, Product, Unit } from '../models/types';

export const uid = (prefix = 'id') => `${prefix}_${crypto.randomUUID()}`;
export const now = () => new Date().toISOString();
export const normalize = (value: string) => value.trim().toLocaleLowerCase('it-IT').replace(/\s+/g, ' ');
export const formatQuantity = (quantity: number, unit: Unit) => `${quantity} ${unit}`;
export const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) : 'Senza scadenza';
export const formatDateTime = (value: string) => new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
export const daysUntil = (value?: string) => {
  if (!value) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${value}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
};
export const categoryFromName = (name: string): Category => {
  const text = normalize(name);
  if (/latte|yogurt|mozzarella|burro|formaggio/.test(text)) return 'Latticini';
  if (/uov/.test(text)) return 'Uova';
  if (/prosciutto|carne|salame/.test(text)) return 'Carne e salumi';
  if (/mela|banana|frutta|arancia/.test(text)) return 'Frutta';
  if (/verdura|insalata|pomodoro|zucchin/.test(text)) return 'Verdura';
  if (/acqua|succo|bibita/.test(text)) return 'Bevande';
  return 'Altro';
};
export const productNeedsShopping = (product: Product) => product.quantity <= product.minQuantity;
export const getDashboardStats = (products: Product[], expiryNoticeDays: number): DashboardStats => ({
  totalProducts: products.reduce((total, product) => total + product.quantity, 0),
  lowStock: products.filter((product) => product.quantity > 0 && productNeedsShopping(product)).length,
  outOfStock: products.filter((product) => product.quantity === 0).length,
  expiringSoon: products.filter((product) => daysUntil(product.expiryDate) <= expiryNoticeDays).length
});
export const toCsv = (rows: Record<string, string | number | boolean>[]) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number | boolean) => `"${String(value).replaceAll('"', '""')}"`;
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n');
};
