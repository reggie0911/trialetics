/**
 * When loading a stored value, apply NANP formatting only if it looks like a US/Canada number.
 * Other formats (e.g. international) are left unchanged for editing.
 */
export function normalizePhoneDisplayForInput(stored: string): string {
  if (!stored.trim()) return '';
  const digits = stored.replace(/\D/g, '');
  if (digits.length === 10 || (digits.length === 11 && digits.startsWith('1'))) {
    return formatNanpPhoneInput(stored);
  }
  return stored;
}

/**
 * Formats phone entry as (XXX) XXX-XXXX for US/Canada NANP (optional leading country code 1).
 * Non-digits are stripped; input is capped at 10 national digits.
 */
export function formatNanpPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  let rest = digits;
  if (rest.startsWith('1') && rest.length > 1) {
    rest = rest.slice(1);
  }
  rest = rest.slice(0, 10);
  if (rest.length === 0) return '';
  if (rest.length <= 3) return `(${rest}`;
  if (rest.length <= 6) return `(${rest.slice(0, 3)}) ${rest.slice(3)}`;
  return `(${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6)}`;
}

/**
 * NANP-style mask while the value still looks like US/Canada; otherwise keep raw (e.g. international) for edit flows.
 */
export function formatPhoneFieldInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return '';
  const looksNanp =
    digits.length <= 10 || (digits.length === 11 && digits.startsWith('1'));
  if (looksNanp) return formatNanpPhoneInput(raw);
  return raw;
}
