export function normalizeRut(value: unknown): string {
  return String(value ?? '').replace(/[^0-9kK]/g, '').toUpperCase();
}

export function formatRut(value: unknown): string {
  const normalized = normalizeRut(value);
  if (normalized.length < 2) {
    return normalized;
  }
  const body = normalized.slice(0, -1);
  const dv = normalized.slice(-1);
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
}

export function isValidRut(value: unknown): boolean {
  const normalized = normalizeRut(value);
  if (!/^\d{7,8}[0-9K]$/.test(normalized)) {
    return false;
  }
  const body = normalized.slice(0, -1);
  const suppliedDv = normalized.slice(-1);
  let sum = 0;
  let multiplier = 2;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  const expectedDv = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
  return suppliedDv === expectedDv;
}

export function formatRutInput(input: HTMLInputElement): void {
  const normalized = normalizeRut(input.value).slice(0, 9);
  input.value = formatRut(normalized);
  input.setSelectionRange(input.value.length, input.value.length);
}
