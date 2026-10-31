import { categoryFromName } from '../utils/helpers';
import type { Category } from '../models/types';

export interface ExternalProduct {
  barcode: string;
  name: string;
  brand?: string;
  image?: string;
  category: Category;
}

export async function lookupOpenFoodFacts(barcode: string): Promise<ExternalProduct | null> {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`, { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const data = await response.json() as { status?: number; product?: { product_name_it?: string; product_name?: string; brands?: string; image_front_small_url?: string; categories_tags?: string[] } };
    if (data.status !== 1 || !data.product) return null;
    const name = data.product.product_name_it || data.product.product_name;
    if (!name) return null;
    return { barcode, name, brand: data.product.brands, image: data.product.image_front_small_url, category: categoryFromName(name) };
  } catch {
    return null;
  }
}
