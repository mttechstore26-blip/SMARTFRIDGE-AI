import { describe, expect, it } from 'vitest';
import { findVoiceProduct, parseCommand } from './voiceParser';

describe('voice inventory control', () => {
  it('understands quantity-free and quantified phrases', () => {
    expect(parseCommand('Aggiungi latte')).toEqual({intent:'add',quantity:1,product:'latte'});
    expect(parseCommand('Togli due succhi Yoga')).toEqual({intent:'remove',quantity:2,product:'succhi yoga'});
    expect(parseCommand('Ho comprato tre yogurt')).toEqual({intent:'add',quantity:3,product:'yogurt'});
    expect(parseCommand('Ho mangiato un Kinder Pingui')).toEqual({intent:'remove',quantity:1,product:'kinder pingui'});
    expect(parseCommand('Compra due yogurt')).toEqual({intent:'shopping-add',quantity:2,product:'yogurt'});
  });
  it('matches singular and plural without confusing brands', () => {
    const products=[{name:'Succo Yoga pesca'},{name:'Kinder Pinguì'},{name:'Yogurt Fragola'},{name:'Yogurt Vaniglia'}];
    expect(findVoiceProduct('succhi yoga pesca',products).product?.name).toBe('Succo Yoga pesca');
    expect(findVoiceProduct('Kinder Pingui',products).product?.name).toBe('Kinder Pinguì');
    expect(findVoiceProduct('yogurt',products).ambiguous).toBe(true);
    expect(findVoiceProduct('yogurt fragola',products).product?.name).toBe('Yogurt Fragola');
  });
});
