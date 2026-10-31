import { normalize } from '../utils/helpers';

const articles = new Set(['un', 'uno', 'una', 'il', 'lo', 'la', 'i', 'gli', 'le', 'dei', 'delle', 'del', 'della', 'di', 'confezione', 'confezioni']);
const numbers: Record<string, number> = { un:1, uno:1, una:1, due:2, tre:3, quattro:4, cinque:5, sei:6, sette:7, otto:8, nove:9, dieci:10, undici:11, dodici:12, tredici:13, quattordici:14, quindici:15, sedici:16, diciassette:17, diciotto:18, diciannove:19, venti:20 };
const singular: Record<string,string> = { succhi:'succo', yogurt:'yogurt', uova:'uovo', bottiglie:'bottiglia', vasetti:'vasetto', confezioni:'confezione', sottilette:'sottiletta', panini:'panino' };
export function productTokens(value: string): string[] {
  return normalize(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean)
    .filter(token => !articles.has(token)).map(token => singular[token] ?? (token.endsWith('i') && token.length > 5 ? token.slice(0,-1) + 'o' : token));
}
export function findVoiceProduct<T extends { name: string; brand?: string }>(query: string, products: T[]): { product?: T; ambiguous: boolean } {
  const wanted = productTokens(query);
  if (!wanted.length) return { ambiguous: false };
  const matches = products.map(product => {
    const tokens = productTokens(product.name + ' ' + (product.brand ?? ''));
    const matching = wanted.filter(word => tokens.includes(word)).length;
    const all = matching === wanted.length;
    return { product, matching, all, extra: tokens.length - matching };
  }).filter(item => item.all).sort((a,b) => a.extra - b.extra);
  if (!matches.length) return { ambiguous: false };
  if (matches.length > 1 && matches[0].extra === matches[1].extra) return { ambiguous: true };
  return { product: matches[0].product, ambiguous: false };
}
export type ParsedCommand =
  | { intent:'add'|'remove'|'shopping-add'; product:string; quantity:number }
  | { intent:'query'; product?:string }
  | { intent:'shopping-list'|'expiring' }
  | { intent:'unknown'; text:string };

function clean(value:string) { return value.replace(/\s+(nel|nella|in|al)\s+frigo.*$/,'').replace(/[.,!?]+$/,'').trim(); }
function parseAmount(value:string) {
  const match=value.match(/^(\d+|[a-z]+)\s+(.+)$/);
  if (match && (match[1] in numbers || /^\d+$/.test(match[1]))) return { quantity: Number(match[1]) || numbers[match[1]], product:clean(match[2]) };
  return { quantity:1, product:clean(value.replace(/^(?:il|lo|la|i|gli|le)\s+/,'')) };
}
export function parseCommand(input:string):ParsedCommand {
  const text=normalize(input).replace(/^ehi frigo[,:]?\s*/,'').replace(/^(?:per favore|puoi)\s+/,'').trim();
  if (/cosa devo comprare|lista della spesa|lista spesa/.test(text)) return {intent:'shopping-list'};
  if (/quali prodotti.*scad|in scadenza|stanno per scadere/.test(text)) return {intent:'expiring'};
  const query=text.match(/^(?:quanto|quanta|quante|quanti)\s+(.+?)(?:\s+(?:è rimasto|sono rimasti|sono rimaste|abbiamo|rimane))?\??$/);
  if (query) return {intent:'query',product:clean(query[1])};
  const prefixes: { regex:RegExp; intent:'add'|'remove'|'shopping-add' }[] = [
    {regex:/^(?:aggiungi alla lista|metti nella lista|segna da comprare|compra)\s+/,intent:'shopping-add'},
    {regex:/^(?:aggiungi|metti|inserisci|ho comprato|ho acquistato|abbiamo comprato|abbiamo acquistato|ho portato a casa)\s+/,intent:'add'},
    {regex:/^(?:togli|rimuovi|scarica|consuma|ho consumato|ho mangiato|ho bevuto|abbiamo mangiato|abbiamo bevuto|abbiamo consumato|ho preso)\s+/,intent:'remove'}
  ];
  for(const item of prefixes) {
    const match=text.match(item.regex);
    if(!match)continue;
    const {quantity,product}=parseAmount(text.slice(match[0].length));
    if(!product || quantity < 1 || quantity > 1000) return {intent:'unknown',text:input};
    return {intent:item.intent,product,quantity};
  }
  return {intent:'unknown',text:input};
}
export function commandHelp() { return ['“Aggiungi due succhi Yoga”','“Togli un Kinder Pingui”','“Ho comprato tre yogurt”','“Ho mangiato un panino”','“Quanto latte abbiamo?”','“Cosa devo comprare?”']; }
