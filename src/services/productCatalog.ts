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
type OFFProduct = { code?: string; product_name_it?: string; product_name?: string; brands?: string; quantity?: string; image_front_small_url?: string };
const prefix = 'smartfridge-catalog-v1:';
export async function searchProductCatalog(term: string): Promise<CatalogProduct[]> {
  const query = term.trim().slice(0, 80);
  if (query.length < 2) return [];
  const key = prefix + query.toLocaleLowerCase('it');
  try {
    const cache = localStorage.getItem(key);
    if (cache) {
      const saved = JSON.parse(cache) as { expires: number; products: CatalogProduct[] };
      if (saved.expires > Date.now()) return saved.products;
    }
  } catch { /* Cache unavailable */ }
  const params = new URLSearchParams({ search_terms: query, search_simple: '1', action: 'process', json: '1', page_size: '30', fields: 'code,product_name_it,product_name,brands,quantity,image_front_small_url' });
  const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Catalogo non disponibile');
  const data = await response.json() as { products?: OFFProduct[] };
  const seen = new Set<string>();
  const products = (data.products ?? []).flatMap((item) => {
    const barcode = (item.code ?? '').trim();
    const name = (item.product_name_it || item.product_name || '').trim();
    if (!/^\d{8,14}$/.test(barcode) || !name || seen.has(barcode)) return [];
    seen.add(barcode);
    return [{ barcode, name, brand: item.brands?.trim() ?? '', format: item.quantity?.trim() ?? '', image: item.image_front_small_url, category: categoryFromName(name) }];
  });
  try { localStorage.setItem(key, JSON.stringify({ expires: Date.now() + 7 * 86400000, products })); } catch { /* Cache optional */ }
  return products;
}
