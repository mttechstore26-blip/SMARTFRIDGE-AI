import { normalize } from '../utils/helpers';

type FoodFactsProduct = {
  code?: string;
  product_name_it?: string;
  product_name?: string;
  brands?: string;
  image_front_url?: string;
  image_front_small_url?: string;
};

const fields = 'code,product_name_it,product_name,brands,image_front_url,image_front_small_url';

function safeImage(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'images.openfoodfacts.org' || url.hostname === 'static.openfoodfacts.org') ? url.href : undefined;
  } catch { return undefined; }
}

function normalizedTokens(value: string): string[] {
  return normalize(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter((token) => token.length > 2);
}
function isReliableMatch(item: FoodFactsProduct, name: string, brand?: string): boolean {
  const title = item.product_name_it || item.product_name || '';
  const wanted = normalizedTokens(name);
  const actual = normalizedTokens(title + ' ' + (item.brands ?? ''));
  if (!wanted.length || !wanted.every((token) => actual.includes(token))) return false;
  const brandTokens = normalizedTokens(brand ?? '');
  return !brandTokens.length || brandTokens.every((token) => actual.includes(token));
}

async function jsonFrom(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    return await response.json() as unknown;
  } finally { clearTimeout(timeout); }
}

/** Return a reliable product photograph. Never silently assign a merely similar package. */
export async function findFoodImage(name: string, brand?: string, barcode?: string): Promise<string | undefined> {
  try {
    if (barcode && /^\d{8,14}$/.test(barcode)) {
      const data = await jsonFrom(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${fields}`) as { status?: number; product?: FoodFactsProduct } | null;
      if (data?.status === 1 && data.product?.code === barcode) {
        const image = safeImage(data.product.image_front_url) ?? safeImage(data.product.image_front_small_url);
        if (image) return image;
      }
    }
    if (name.trim().length < 3) return undefined;
    const params = new URLSearchParams({
      search_terms: [brand, name].filter(Boolean).join(' ').slice(0, 100),
      search_simple: '1', action: 'process', json: '1', page_size: '25',
      fields, sort_by: 'unique_scans_n'
    });
    const data = await jsonFrom(`https://world.openfoodfacts.org/cgi/search.pl?${params}`) as { products?: FoodFactsProduct[] } | null;
    for (const item of data?.products ?? []) {
      if (isReliableMatch(item, name, brand)) {
        const image = safeImage(item.image_front_url) ?? safeImage(item.image_front_small_url);
        if (image) return image;
      }
    }
  } catch { /* Offline or throttled: manual photo is still available. */ }
  return undefined;
}

/** Downsize user photos before IndexedDB, JSON backups and VPS sync. */
export async function prepareFoodPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Seleziona un file immagine.');
  if (file.size > 12 * 1024 * 1024) throw new Error('Immagine troppo grande (massimo 12 MB).');
  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 480 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Impossibile elaborare questa foto.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL('image/jpeg', 0.72);
    if (result.length > 250000) throw new Error('Foto troppo grande dopo la compressione.');
    return result;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Non riesco a leggere questa foto.');
  } finally {
    URL.revokeObjectURL(source);
  }
}
