function normalizeRut(rut) {
    return String(rut || '')
        .replace(/\./g, '')
        .replace(/-/g, '')
        .replace(/\s/g, '')
        .toUpperCase();
}

function isValidRut(rut) {
    const normalized = normalizeRut(rut);
    if (!/^\d{7,8}[0-9K]$/.test(normalized)) return false;
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

function formatRut(rut) {
    const normalized = normalizeRut(rut);
    if (normalized.length < 2) return normalized;
    const body = normalized.slice(0, -1);
    const dv = normalized.slice(-1);
    return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
}

module.exports = { normalizeRut, isValidRut, formatRut };
