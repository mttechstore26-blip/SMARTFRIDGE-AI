import { categoryFromName, normalize } from '../utils/helpers';
import { db } from '../database/db';
import type { Product } from '../models/types';
import type { Category } from '../models/types';

export interface CatalogProduct {
  barcode: string;
  source?: 'personal' | 'online';
  name: string;
  brand: string;
  format: string;
  image?: string;
  category: Category;
}

type OFFProduct = {
  code?: string;
  product_name_it?: string;
  product_name?: string;
  brands?: string;
  quantity?: string;
  image_front_small_url?: string;
  countries_tags?: string[];
};


const personalCatalogKey = 'smartfridge-personal-catalog-v1';

function personalEntry(product: Product): CatalogProduct {
  return { barcode: product.barcode ?? '', name: product.name, brand: product.brand ?? '', category: product.category, format: '', image: product.image, source: 'personal' };
}
function catalogIdentity(product: CatalogProduct): string {
  return product.barcode || normalize(product.name) + '|' + normalize(product.brand);
}
function savedPersonalCatalog(): CatalogProduct[] {
  try {
    const items: unknown = JSON.parse(localStorage.getItem(personalCatalogKey) ?? '[]');
    if (!Array.isArray(items)) return [];
    return items.filter((item): item is CatalogProduct => Boolean(item && typeof item.name === 'string' && item.name.trim() && typeof item.barcode === 'string' && typeof item.category === 'string')).slice(-1000);
  } catch { return []; }
}
/** Remember validated products after a successful save; never uploads them to the public catalog. */
export function rememberPersonalProduct(product: Product) {
  try {
    const entry = personalEntry(product);
    const previous = savedPersonalCatalog().filter((item) => catalogIdentity(item) !== catalogIdentity(entry));
    localStorage.setItem(personalCatalogKey, JSON.stringify([...previous, entry].slice(-1000)));
  } catch { /* Saved inventory remains authoritative if browser storage is unavailable. */ }
}
/** Local and synchronized-inventory products are always searchable, including without Internet. */
export async function searchPersonalCatalog(term: string): Promise<CatalogProduct[]> {
  const query = normalize(term);
  if (query.length < 2) return [];
  const inventory = (await db.products.toArray()).map(personalEntry);
  const unique = new Map<string, CatalogProduct>();
  for (const item of [...inventory, ...savedPersonalCatalog()]) {
    if (normalize(item.name + ' ' + item.brand + ' ' + item.barcode).includes(query)) {
      const identity = catalogIdentity(item);
      if (!unique.has(identity)) unique.set(identity, item);
    }
  }
  return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name, 'it'));
}

const prefix = 'smartfridge-catalog-v3:';
export const CATALOG_PAGE_SIZE = 150;
const fields = 'code,product_name_it,product_name,brands,quantity,image_front_small_url,countries_tags';
const cacheDuration = 7 * 86400000;

function toCatalogProduct(product: OFFProduct): CatalogProduct | undefined {
  const barcode = (product.code ?? '').trim();
  const name = (product.product_name_it || product.product_name || '').trim();
  if (!/^\d{8,14}$/.test(barcode) || !name) return undefined;
  return {
    barcode,
    name,
    brand: product.brands?.trim() ?? '',
    format: product.quantity?.trim() ?? '',
    image: product.image_front_small_url,
    category: categoryFromName(name)
  };
}

function getCache(key: string): CatalogProduct[] | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    const cached = JSON.parse(raw) as { expires: number; products: CatalogProduct[] };
    return cached.expires > Date.now() ? cached.products : undefined;
  } catch { return undefined; }
}

function putCache(key: string, products: CatalogProduct[]) {
  try { localStorage.setItem(key, JSON.stringify({ expires: Date.now() + cacheDuration, products })); } catch { /* Optional local cache */ }
}

/** Search across all food brands, formats and products worldwide; exact EAN lookup is supported. */
export async function searchProductCatalog(term: string, page = 1): Promise<CatalogProduct[]> {
  const query = term.trim().slice(0, 100);
  if (query.length < 2) return [];
  const safePage = Math.max(1, Math.min(20, Math.floor(page)));
  const key = prefix + query.toLocaleLowerCase('it') + ':' + safePage;
  const cached = getCache(key);
  if (cached) return cached;

  const isBarcode = /^\d{8,14}$/.test(query);
  if (isBarcode) {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${query}.json?fields=${fields}`, {
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error('Catalogo non disponibile');
    const result = await response.json() as { status?: number; product?: OFFProduct };
    const product = result.status === 1 && result.product ? toCatalogProduct(result.product) : undefined;
    const items = product ? [product] : [];
    putCache(key, items);
    return items;
  }

  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page: String(safePage),
    page_size: String(CATALOG_PAGE_SIZE),
    sort_by: 'unique_scans_n',
    fields
  });
  const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`, {
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) throw new Error(response.status === 429 ? 'Troppe ricerche: riprova tra un minuto.' : 'Catalogo non disponibile');
  const result = await response.json() as { products?: OFFProduct[] };
  const unique = new Map<string, { item: CatalogProduct; italy: boolean }>();
  for (const raw of result.products ?? []) {
    const item = toCatalogProduct(raw);
    if (!item || unique.has(item.barcode)) continue;
    unique.set(item.barcode, { item, italy: raw.countries_tags?.includes('en:italy') ?? false });
  }
  // Prefer products listed in Italy without hiding useful products from elsewhere.
  const products = [...unique.values()]
    .sort((a, b) => Number(b.italy) - Number(a.italy))
    .map(({ item }) => item);
  putCache(key, products);
  return products;
}
