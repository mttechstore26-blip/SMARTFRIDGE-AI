import { useState } from 'react';
import { searchProductCatalog, searchPersonalCatalog, CATALOG_PAGE_SIZE } from '../services/productCatalog';
import type { CatalogProduct } from '../services/productCatalog';
import type { Category, Product, Unit } from '../models/types';
import { CATEGORIES, UNITS } from '../models/types';
import type { ProductDraft } from '../services/inventoryService';


type QuickProduct = { name: string; brand?: string; category: Category; unit?: Unit; notes?: string };
const FREQUENT_PRODUCTS: QuickProduct[] = [
  { name: 'Kinder Pingui', brand: 'Kinder', category: 'Latticini' },
  { name: 'Muu Muu Mini Cioccolato 6 x 50 g', brand: 'cameo', category: 'Latticini', unit: 'confezioni' },
  { name: 'Philadelphia senza lattosio', brand: 'Philadelphia', category: 'Latticini' },
  { name: 'Sottilette senza lattosio', brand: 'Sottilette', category: 'Latticini' },
  { name: 'Succo Yoga pesca', brand: 'Yoga', category: 'Bevande' },
  { name: 'Prosciutto cotto', category: 'Carne e salumi' },
  { name: 'Prosciutto crudo', category: 'Carne e salumi' },
  { name: 'Salame', category: 'Carne e salumi' },
  { name: 'Bresaola', category: 'Carne e salumi' },
  { name: 'Fesa di tacchino affettata', category: 'Carne e salumi' },
  { name: 'Speck', category: 'Carne e salumi' },
  { name: 'Mortadella', category: 'Carne e salumi' },
  { name: 'Affettati misti', category: 'Carne e salumi' }
];

interface ProductFormProps {
  product?: Product;
  initialDraft?: Partial<ProductDraft>;
  onSubmit: (draft: ProductDraft) => Promise<void> | void;
  onCancel: () => void;
}

export function ProductForm({ product, initialDraft, onSubmit, onCancel }: ProductFormProps) {
  const [draft, setDraft] = useState<ProductDraft>({ barcode: product?.barcode ?? initialDraft?.barcode ?? '', name: product?.name ?? initialDraft?.name ?? '', brand: product?.brand ?? initialDraft?.brand ?? '', category: product?.category ?? initialDraft?.category ?? 'Altro', image: product?.image ?? initialDraft?.image ?? '', quantity: product?.quantity ?? 1, unit: product?.unit ?? 'pezzi', minQuantity: product?.minQuantity ?? 1, targetQuantity: product?.targetQuantity ?? 2, expiryDate: product?.expiryDate ?? '', notes: product?.notes ?? '' });
  const [error, setError] = useState('');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogResults, setCatalogResults] = useState<CatalogProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogHasMore, setCatalogHasMore] = useState(false);
  const [catalogMessage, setCatalogMessage] = useState('');
  const [lastSearch, setLastSearch] = useState(0);
  const searchCatalog = async (nextPage = 1) => {
    const query = catalogQuery.trim();
    if (query.length < 2 || catalogLoading) return;
    // Personal entries are instant and searchable offline. Online lookup is optional.
    const personal = nextPage === 1 ? await searchPersonalCatalog(query) : [];
    if (nextPage === 1) {
      setCatalogResults(personal);
      setCatalogPage(1);
      setCatalogHasMore(false);
      setCatalogMessage(personal.length ? `${personal.length} prodotti del tuo catalogo personale trovati.` : '');
    }
    if (Date.now() - lastSearch < 6500) {
      if (!personal.length) setCatalogMessage('Attendi qualche secondo prima della ricerca online.');
      return;
    }
    setLastSearch(Date.now());
    setCatalogLoading(true);
    try {
      const found = await searchProductCatalog(query, nextPage);
      setCatalogPage(nextPage);
      setCatalogHasMore(!/^\d{8,14}$/.test(query) && found.length >= CATALOG_PAGE_SIZE);
      setCatalogResults((previous) => {
        const all = nextPage === 1 ? [...personal, ...found] : [...previous, ...found];
        const unique = new Map<string, CatalogProduct>();
        for (const item of all) {
          const key = item.barcode || `${item.name.toLocaleLowerCase('it')}|${item.brand.toLocaleLowerCase('it')}`;
          if (!unique.has(key)) unique.set(key, item);
        }
        return [...unique.values()];
      });
      if (!found.length && !personal.length && nextPage === 1) setCatalogMessage('Nessun prodotto trovato: puoi inserirlo manualmente qui sotto.');
    } catch {
      setCatalogHasMore(false);
      setCatalogMessage(personal.length ? 'Prodotti personali disponibili. Ricerca online temporaneamente non disponibile.' : 'Ricerca online non disponibile. Puoi inserire il prodotto manualmente.');
    } finally { setCatalogLoading(false); }
  };
  const chooseCatalogProduct = (item: CatalogProduct) => {
    setDraft((current) => ({ ...current, name: item.name, brand: item.brand, barcode: item.barcode, category: item.category, image: item.image ?? '' }));
    setCatalogResults([]);
    setCatalogMessage(`Selezionato: ${item.name}${item.format ? ` · ${item.format}` : ''}. Verifica la confezione e salva il prodotto.`);
  };
  const chooseFrequentProduct = (item: QuickProduct) => {
    setDraft((current) => ({ ...current, name: item.name, brand: item.brand ?? '', category: item.category, barcode: '', image: '', quantity: 1, unit: item.unit ?? 'confezioni', expiryDate: '', notes: item.notes ?? '' }));
    setCatalogMessage('Prodotto frequente selezionato. Verifica la confezione, aggiungi eventuale EAN e scadenza, poi salva.');
    setCatalogResults([]);
  };
  const update = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setError(''); try { await onSubmit({ ...draft, quantity: Number(draft.quantity), minQuantity: Number(draft.minQuantity), targetQuantity: Number(draft.targetQuantity), barcode: draft.barcode || undefined, expiryDate: draft.expiryDate || undefined }); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossibile salvare il prodotto.'); } };
  return <form className="product-form" onSubmit={submit}>
    <div className="form-heading"><div><span className="eyebrow">{product ? 'Modifica scheda' : 'Nuova scheda'}</span><h2>{product ? product.name : 'Aggiungi al frigo'}</h2></div><button type="button" className="icon-button" onClick={onCancel} aria-label="Chiudi">×</button></div>
    {error && <div className="form-error">{error}</div>}
    {!product && <section className="frequent-products" aria-label="Prodotti acquistati spesso">
      <strong>Prodotti acquistati spesso</strong>
      <p>Tocca un prodotto per compilare la scheda. Per gli affettati scegli il tipo; puoi poi modificare la marca.</p>
      <div className="frequent-products-grid">{FREQUENT_PRODUCTS.map((item) => <button type="button" className="frequent-product-button" key={item.name} onClick={() => chooseFrequentProduct(item)}>{item.name}</button>)}</div>
      <small>Il prodotto viene aggiunto all'inventario solo quando premi “Aggiungi prodotto”. Codice a barre e scadenza non sono preimpostati.</small>
    </section>}
    {!product && <section className="catalog-search" aria-label="Catalogo alimentare online">
      <strong>Cerca nel catalogo alimentare</strong>
      <p>Trova prima i prodotti che hai già salvato, anche offline, oppure cerca alimenti di tutte le marche per nome o EAN: latte, pasta, yogurt, merendine, bevande, surgelati, conserve e molto altro. Fino a 150 risultati per pagina. Non serve la fotocamera.</p>
      <div className="catalog-search-row"><input aria-label="Nome o marca da cercare" value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void searchCatalog(1); } }} placeholder="Nome, marca o EAN (es. Barilla)" /><button className="button secondary" type="button" disabled={catalogQuery.trim().length < 2 || catalogLoading} onClick={() => void searchCatalog(1)}>{catalogLoading ? 'Ricerca…' : 'Cerca'}</button></div>
      {catalogMessage && <p role="status">{catalogMessage}</p>}
      {catalogResults.length > 0 && <div className="catalog-results" aria-label="Risultati catalogo">{catalogResults.map((item) => <button type="button" className="catalog-result" key={item.barcode} onClick={() => chooseCatalogProduct(item)}><span><strong>{item.name}</strong><small>{item.brand}{item.format ? ` · ${item.format}` : ''}</small><small>{item.source === 'personal' ? 'Il tuo catalogo' : 'Open Food Facts'}{item.barcode ? ` · EAN: ${item.barcode}` : ' · Senza EAN'}</small></span><span>Seleziona</span></button>)}</div>}
      {catalogHasMore && catalogResults.length > 0 && <button type="button" className="button secondary" disabled={catalogLoading} onClick={() => void searchCatalog(catalogPage + 1)}>{catalogLoading ? 'Caricamento…' : 'Mostra altri prodotti'}</button>}
      <small>I prodotti che aggiungi vengono ricordati nel tuo catalogo personale; le schede presenti nell’inventario sono disponibili anche dopo la sincronizzazione. Open Food Facts resta una fonte esterna separata.</small>
    </section>}
    <div className="form-grid">
      <label className="field field-wide">Nome prodotto<input autoFocus value={draft.name} onChange={(event) => update('name', event.target.value)} placeholder="es. Latte intero" required /></label>
      <label className="field">Marca<input value={draft.brand} onChange={(event) => update('brand', event.target.value)} placeholder="Facoltativa" /></label>
      <label className="field">Codice a barre<input inputMode="numeric" value={draft.barcode} onChange={(event) => update('barcode', event.target.value)} placeholder="EAN / UPC" /></label>
      <label className="field">Categoria<select value={draft.category} onChange={(event) => update('category', event.target.value as Category)}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
      <label className="field">Unità<select value={draft.unit} onChange={(event) => update('unit', event.target.value as Unit)}>{UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
      <label className="field">Quantità<input type="number" min="0" step="0.1" value={draft.quantity} onChange={(event) => update('quantity', Number(event.target.value))} required /></label>
      <label className="field">Soglia minima<input type="number" min="0" step="0.1" value={draft.minQuantity} onChange={(event) => update('minQuantity', Number(event.target.value))} /></label>
      <label className="field">Obiettivo acquisto<input type="number" min="0" step="0.1" value={draft.targetQuantity} onChange={(event) => update('targetQuantity', Number(event.target.value))} /></label>
      <label className="field">Scadenza<input type="date" value={draft.expiryDate} onChange={(event) => update('expiryDate', event.target.value)} /></label>
      <label className="field field-wide">Note<textarea rows={2} value={draft.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Lotto, preferenze, appunti…" /></label>
    </div>
    <div className="form-actions"><button type="button" className="button secondary" onClick={onCancel}>Annulla</button><button type="submit" className="button primary">{product ? 'Salva modifiche' : 'Aggiungi prodotto'}</button></div>
  </form>;
}
