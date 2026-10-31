import { useState } from 'react';
import { searchProductCatalog } from '../services/productCatalog';
import type { CatalogProduct } from '../services/productCatalog';
import type { Category, Product, Unit } from '../models/types';
import { CATEGORIES, UNITS } from '../models/types';
import type { ProductDraft } from '../services/inventoryService';

interface ProductFormProps {
  product?: Product;
  onSubmit: (draft: ProductDraft) => Promise<void> | void;
  onCancel: () => void;
}

export function ProductForm({ product, onSubmit, onCancel }: ProductFormProps) {
  const [draft, setDraft] = useState<ProductDraft>({ barcode: product?.barcode ?? '', name: product?.name ?? '', brand: product?.brand ?? '', category: product?.category ?? 'Altro', image: product?.image ?? '', quantity: product?.quantity ?? 1, unit: product?.unit ?? 'pezzi', minQuantity: product?.minQuantity ?? 1, targetQuantity: product?.targetQuantity ?? 2, expiryDate: product?.expiryDate ?? '', notes: product?.notes ?? '' });
  const [error, setError] = useState('');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogResults, setCatalogResults] = useState<CatalogProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogHasMore, setCatalogHasMore] = useState(false);
  const [catalogMessage, setCatalogMessage] = useState('');
  const [lastSearch, setLastSearch] = useState(0);
  const searchCatalog = async (nextPage = 1) => {
    if (catalogQuery.trim().length < 2 || catalogLoading) return;
    if (Date.now() - lastSearch < 6500) { setCatalogMessage('Attendi qualche secondo prima di cercare ancora.'); return; }
    setLastSearch(Date.now());
    setCatalogLoading(true);
    setCatalogMessage('');
    try {
      const found = await searchProductCatalog(catalogQuery, nextPage);
      setCatalogPage(nextPage);
      setCatalogHasMore(!/^\d{8,14}$/.test(catalogQuery.trim()) && found.length >= 75);
      setCatalogResults((previous) => nextPage === 1 ? found : [...previous, ...found.filter((item) => !previous.some((saved) => saved.barcode === item.barcode))]);
      if (!found.length) setCatalogMessage(nextPage === 1 ? 'Nessun prodotto trovato: puoi inserirlo manualmente qui sotto.' : 'Non ci sono altri risultati.');
    } catch {
      setCatalogResults([]);
      setCatalogMessage('Ricerca online non disponibile. Puoi comunque inserire il prodotto manualmente.');
    } finally { setCatalogLoading(false); }
  };
  const chooseCatalogProduct = (item: CatalogProduct) => {
    setDraft((current) => ({ ...current, name: item.name, brand: item.brand, barcode: item.barcode, category: item.category, image: item.image ?? '' }));
    setCatalogResults([]);
    setCatalogMessage(`Selezionato: ${item.name}${item.format ? ` · ${item.format}` : ''}. Verifica la confezione e salva il prodotto.`);
  };
  const update = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setError(''); try { await onSubmit({ ...draft, quantity: Number(draft.quantity), minQuantity: Number(draft.minQuantity), targetQuantity: Number(draft.targetQuantity), barcode: draft.barcode || undefined, expiryDate: draft.expiryDate || undefined }); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossibile salvare il prodotto.'); } };
  return <form className="product-form" onSubmit={submit}>
    <div className="form-heading"><div><span className="eyebrow">{product ? 'Modifica scheda' : 'Nuova scheda'}</span><h2>{product ? product.name : 'Aggiungi al frigo'}</h2></div><button type="button" className="icon-button" onClick={onCancel} aria-label="Chiudi">×</button></div>
    {error && <div className="form-error">{error}</div>}
    {!product && <section className="catalog-search" aria-label="Catalogo alimentare online">
      <strong>Cerca nel catalogo alimentare</strong>
      <p>Cerca alimenti di qualsiasi marca, per nome o EAN: latte, pasta, yogurt, merendine, bevande e molto altro. Non serve la fotocamera.</p>
      <div className="catalog-search-row"><input aria-label="Nome o marca da cercare" value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void searchCatalog(1); } }} placeholder="Nome, marca o EAN (es. Barilla)" /><button className="button secondary" type="button" disabled={catalogQuery.trim().length < 2 || catalogLoading} onClick={() => void searchCatalog(1)}>{catalogLoading ? 'Ricerca…' : 'Cerca'}</button></div>
      {catalogMessage && <p role="status">{catalogMessage}</p>}
      {catalogResults.length > 0 && <div className="catalog-results" aria-label="Risultati catalogo">{catalogResults.map((item) => <button type="button" className="catalog-result" key={item.barcode} onClick={() => chooseCatalogProduct(item)}><span><strong>{item.name}</strong><small>{item.brand}{item.format ? ` · ${item.format}` : ''}</small><small>EAN: {item.barcode}</small></span><span>Seleziona</span></button>)}</div>}
      {catalogHasMore && catalogResults.length > 0 && <button type="button" className="button secondary" disabled={catalogLoading} onClick={() => void searchCatalog(catalogPage + 1)}>{catalogLoading ? 'Caricamento…' : 'Mostra altri prodotti'}</button>}
      <small>Fonte: Open Food Facts. Controlla EAN e formato sulla confezione. I risultati vengono salvati temporaneamente per l'uso offline.</small>
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
