export const CATEGORIES = ['Latticini', 'Carne e salumi', 'Uova', 'Frutta', 'Verdura', 'Bevande', 'Dispensa', 'Surgelati', 'Altro'] as const;
export type Category = (typeof CATEGORIES)[number];
export const UNITS = ['pezzi', 'confezioni', 'bottiglie', 'vasetti', 'litri', 'millilitri', 'chilogrammi', 'grammi'] as const;
export type Unit = (typeof UNITS)[number];
export type MovementMethod = 'scanner' | 'touch' | 'voce' | 'manuale';
export type MovementType = 'entrata' | 'uscita' | 'creazione' | 'modifica' | 'annullamento';
export type ShoppingSource = 'automatico' | 'manuale';

export interface Lot {
  id: string;
  quantity: number;
  expiryDate?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  barcode?: string;
  name: string;
  brand?: string;
  category: Category;
  image?: string;
  quantity: number;
  unit: Unit;
  minQuantity: number;
  targetQuantity: number;
  expiryDate?: string;
  lots: Lot[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Movement {
  id: string;
  productId: string;
  productName: string;
  type: MovementType;
  quantity: number;
  method: MovementMethod;
  timestamp: string;
  previousQuantity?: number;
  nextQuantity?: number;
  undone?: boolean;
  lotChanges?: Array<{ lotId: string; quantity: number; expiryDate?: string; action: 'add' | 'remove' }>;
}

export interface ShoppingItem {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  unit: Unit;
  source: ShoppingSource;
  purchased: boolean;
  createdAt: string;
}

export interface Settings {
  id: 'settings';
  theme: 'chiaro' | 'scuro' | 'sistema';
  standbySeconds: number;
  expiryNoticeDays: 1 | 3 | 7;
  voiceEnabled: boolean;
}

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  products: Product[];
  movements: Movement[];
  shopping: ShoppingItem[];
  settings: Settings;
}

export interface DashboardStats {
  totalProducts: number;
  lowStock: number;
  outOfStock: number;
  expiringSoon: number;
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  theme: 'sistema',
  standbySeconds: 30,
  expiryNoticeDays: 3,
  voiceEnabled: true
};
