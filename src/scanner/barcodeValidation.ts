/** EAN-8, EAN-13 and UPC-A with GS1 modulo-10 checksum. */
export function validBarcode(value: string): boolean {
  if (!/^(?:\d{8}|\d{12}|\d{13})$/.test(value)) return false;
  const digits = [...value].map(Number);
  const body = digits.slice(0, -1);
  const sum = body.reduce((total, digit, i) => total + digit * ((body.length - i) % 2 === 1 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === digits[digits.length - 1];
}
