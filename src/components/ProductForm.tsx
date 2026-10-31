import { useState } from 'react';
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
  const update = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setError(''); try { await onSubmit({ ...draft, quantity: Number(draft.quantity), minQuantity: Number(draft.minQuantity), targetQuantity: Number(draft.targetQuantity), barcode: draft.barcode || undefined, expiryDate: draft.expiryDate || undefined }); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossibile salvare il prodotto.'); } };
  return <form className="product-form" onSubmit={submit}>
    <div className="form-heading"><div><span className="eyebrow">{product ? 'Modifica scheda' : 'Nuova scheda'}</span><h2>{product ? product.name : 'Aggiungi al frigo'}</h2></div><button type="button" className="icon-button" onClick={onCancel} aria-label="Chiudi">×</button></div>
    {error && <div className="form-error">{error}</div>}
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
