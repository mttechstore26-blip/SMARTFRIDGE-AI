import { normalize } from '../utils/helpers';

export type ParsedCommand =
  | { intent: 'add'; product: string; quantity: number }
  | { intent: 'remove'; product: string; quantity: number }
  | { intent: 'query'; product?: string }
  | { intent: 'shopping-add'; product: string; quantity: number }
  | { intent: 'shopping-list' }
  | { intent: 'expiring' }
  | { intent: 'unknown'; text: string };

const numberWords: Record<string, number> = { un: 1, una: 1, uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10 };
function readQuantity(value?: string) { return value ? Number(value) || numberWords[value] || 1 : 1; }
function cleanProduct(value: string) { return value.replace(/\s+(nel|nella|alla|al|in)\s+frigo.*$/i, '').replace(/\s+(è rimasto|sono rimast[ei]?|abbiamo|rimane).*$/i, '').replace(/[.!?,]+$/, '').trim(); }

export function parseCommand(input: string): ParsedCommand {
  const text = normalize(input).replace(/^ehi frigo[,:]?\s*/, '');
  const quantityPattern = '(\\d+|un[oa]?|due|tre|quattro|cinque|sei|sette|otto|nove|dieci)';
  let match = text.match(new RegExp(`^(?:ho comprato|ho acquistato|ho portato a casa)\\s+${quantityPattern}\\s+(.+)import { normalize } from '../utils/helpers';

export type ParsedCommand =
  | { intent: 'add'; product: string; quantity: number }
  | { intent: 'remove'; product: string; quantity: number }
  | { intent: 'query'; product?: string }
  | { intent: 'shopping-add'; product: string; quantity: number }
  | { intent: 'shopping-list' }
  | { intent: 'expiring' }
  | { intent: 'unknown'; text: string };

const numberWords: Record<string, number> = { un: 1, una: 1, uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10 };
function readQuantity(value?: string) { return value ? Number(value) || numberWords[value] || 1 : 1; }
function cleanProduct(value: string) { return value.replace(/\s+(nel|nella|alla|al|in)\s+frigo.*$/i, '').replace(/\s+(è rimasto|sono rimast[ei]?|abbiamo|rimane).*$/i, '').replace(/[.!?,]+$/, '').trim(); }

export function parseCommand(input: string): ParsedCommand {
  const text = normalize(input).replace(/^ehi frigo[,:]?\s*/, '');
  const quantityPattern = '(\\d+|un[oa]?|due|tre|quattro|cinque|sei|sette|otto|nove|dieci)';
));
  if (match) return { intent: 'add', product: cleanProduct(match[2]), quantity: readQuantity(match[1]) };
  match = text.match(new RegExp(`^(?:ho mangiato|ho bevuto|ho consumato|abbiamo mangiato|abbiamo bevuto|abbiamo consumato)\\s+${quantityPattern}\\s+(.+)import { normalize } from '../utils/helpers';

export type ParsedCommand =
  | { intent: 'add'; product: string; quantity: number }
  | { intent: 'remove'; product: string; quantity: number }
  | { intent: 'query'; product?: string }
  | { intent: 'shopping-add'; product: string; quantity: number }
  | { intent: 'shopping-list' }
  | { intent: 'expiring' }
  | { intent: 'unknown'; text: string };

const numberWords: Record<string, number> = { un: 1, una: 1, uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10 };
function readQuantity(value?: string) { return value ? Number(value) || numberWords[value] || 1 : 1; }
function cleanProduct(value: string) { return value.replace(/\s+(nel|nella|alla|al|in)\s+frigo.*$/i, '').replace(/\s+(è rimasto|sono rimast[ei]?|abbiamo|rimane).*$/i, '').replace(/[.!?,]+$/, '').trim(); }

export function parseCommand(input: string): ParsedCommand {
  const text = normalize(input).replace(/^ehi frigo[,:]?\s*/, '');
  const quantityPattern = '(\\d+|un[oa]?|due|tre|quattro|cinque|sei|sette|otto|nove|dieci)';
));
  if (match) return { intent: 'remove', product: cleanProduct(match[2]), quantity: readQuantity(match[1]) };
  match = text.match(new RegExp(`^(?:aggiungi|metti|compra)\\s+${quantityPattern}\\s+(.+)import { normalize } from '../utils/helpers';

export type ParsedCommand =
  | { intent: 'add'; product: string; quantity: number }
  | { intent: 'remove'; product: string; quantity: number }
  | { intent: 'query'; product?: string }
  | { intent: 'shopping-add'; product: string; quantity: number }
  | { intent: 'shopping-list' }
  | { intent: 'expiring' }
  | { intent: 'unknown'; text: string };

const numberWords: Record<string, number> = { un: 1, una: 1, uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10 };
function readQuantity(value?: string) { return value ? Number(value) || numberWords[value] || 1 : 1; }
function cleanProduct(value: string) { return value.replace(/\s+(nel|nella|alla|al|in)\s+frigo.*$/i, '').replace(/\s+(è rimasto|sono rimast[ei]?|abbiamo|rimane).*$/i, '').replace(/[.!?,]+$/, '').trim(); }

export function parseCommand(input: string): ParsedCommand {
  const text = normalize(input).replace(/^ehi frigo[,:]?\s*/, '');
  const quantityPattern = '(\\d+|un[oa]?|due|tre|quattro|cinque|sei|sette|otto|nove|dieci)';
));
  if (match) return text.includes('lista') || text.startsWith('compra') ? { intent: 'shopping-add', product: cleanProduct(match[2]), quantity: readQuantity(match[1]) } : { intent: 'add', product: cleanProduct(match[2]), quantity: readQuantity(match[1]) };
  match = text.match(new RegExp(`^(?:ho preso|rimuovi|togli|consumato)\\s+${quantityPattern}\\s+(.+)$`));
  if (match) return { intent: 'remove', product: cleanProduct(match[2]), quantity: readQuantity(match[1]) };
  if (/cosa devo comprare|lista della spesa|lista spesa/.test(text)) return { intent: 'shopping-list' };
  if (/quali prodotti.*scad|in scadenza|stanno per scadere/.test(text)) return { intent: 'expiring' };
  const query = text.match(/(?:quanto|quanta|quante|quanti)\s+(.+?)(?:\s+è rimasto|\s+sono rimast|\s+abbiamo|\s+rimane|\s*\?)?$/);
  if (query) return { intent: 'query', product: cleanProduct(query[1]) };
  return { intent: 'unknown', text: input };
}

export function commandHelp() { return ['“Ho comprato tre succhi Yoga”', '“Ho mangiato un Kinder Pingui”', '“Ehi Frigo, aggiungi due yogurt”', '“Ho preso un latte”', '“Quanto burro abbiamo?”', '“Cosa devo comprare?”', '“Quali prodotti stanno per scadere?”']; }
