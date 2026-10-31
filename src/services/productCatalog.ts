import { categoryFromName } from '../utils/helpers';
import type { Category } from '../models/types';

export interface CatalogProduct {
  barcode: string;
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

const prefix = 'smartfridge-catalog-v2:';
const fields = 'code,product_name_it,product_name,brands,quantity,image_front_small_url,countries_tags';
const cacheDuration = 7 * 86400000;

function toCatalogProduct(product: OFFProduct): CatalogProduct | undefined {
  const barcode = (product.code ?? '').trim();
  const name = (product.product_name_it || product.product_name || '').trim();
  if (!/^\\d{8,14}$/.test(barcode) || !name) return undefined;
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

  const isBarcode = /^\\d{8,14}$/.test(query);
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
    page_size: '75',
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
