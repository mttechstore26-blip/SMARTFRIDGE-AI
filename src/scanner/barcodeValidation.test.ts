import { describe, expect, it } from 'vitest';
import { validBarcode } from './barcodeValidation';
describe('GS1 scanner code validation', () => {
  it('validates EAN-13, EAN-8 and UPC-A', () => {
    expect(validBarcode('4006381333931')).toBe(true);
    expect(validBarcode('96385074')).toBe(true);
    expect(validBarcode('036000291452')).toBe(true);
  });
  it('rejects invalid checksum and accidental text', () => {
    expect(validBarcode('4006381333932')).toBe(false);
    expect(validBarcode('12345678')).toBe(false);
    expect(validBarcode('EAN 4006381333931')).toBe(false);
  });
});
