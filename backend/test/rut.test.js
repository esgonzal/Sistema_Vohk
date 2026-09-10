const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeRut, formatRut, isValidRut } = require('../utils/rut');

test('RUT input is normalized and formatted canonically', () => {
    assert.equal(normalizeRut(' 19.489.351-5 '), '194893515');
    assert.equal(formatRut('194893515'), '19.489.351-5');
    assert.equal(formatRut('7.027.804-k'), '7.027.804-K');
});

test('RUT check digit is validated with or without punctuation', () => {
    assert.equal(isValidRut('19.489.351-5'), true);
    assert.equal(isValidRut('194893515'), true);
    assert.equal(isValidRut('19.489.351-4'), false);
    assert.equal(isValidRut('not-a-rut'), false);
});
