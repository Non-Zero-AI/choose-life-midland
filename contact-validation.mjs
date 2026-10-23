// Shared by the contact form and email backend.
export function parseContact(input) {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  if (!value || value.length > 254 || /[\r\n]/.test(value)) return null;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { kind: 'email', value };
  const digits = value.replace(/\D/g, '');
  if (/^\+?[\d\s().-]+$/.test(value) && digits.length >= 7 && digits.length <= 15) {
    return { kind: 'phone', value };
  }
  return null;
}
