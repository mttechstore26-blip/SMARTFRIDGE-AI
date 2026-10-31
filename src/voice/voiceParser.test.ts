import { describe, expect, it } from 'vitest';
import { parseCommand } from './voiceParser';

describe('natural voice inventory commands', () => {
  it('adds purchased items to inventory, not the shopping list', () => {
    expect(parseCommand('Ho comprato tre succhi Yoga')).toEqual({ intent: 'add', quantity: 3, product: 'succhi yoga' });
    expect(parseCommand('Ho acquistato 2 Philadelphia')).toEqual({ intent: 'add', quantity: 2, product: 'philadelphia' });
  });
  it('removes consumed items from inventory', () => {
    expect(parseCommand('Ho mangiato un Kinder Pingui')).toEqual({ intent: 'remove', quantity: 1, product: 'kinder pingui' });
    expect(parseCommand('Ho bevuto due succhi Yoga')).toEqual({ intent: 'remove', quantity: 2, product: 'succhi yoga' });
  });
  it('preserves shopping-list commands', () => {
    expect(parseCommand('Compra due yogurt')).toEqual({ intent: 'shopping-add', quantity: 2, product: 'yogurt' });
  });
  it('preserves old inventory commands', () => {
    expect(parseCommand('Aggiungi due Kinder Pingui')).toEqual({ intent: 'add', quantity: 2, product: 'kinder pingui' });
  });
});
