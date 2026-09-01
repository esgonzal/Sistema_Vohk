const test = require('node:test');
const assert = require('node:assert/strict');
const {
    mapDocumentType,
    mapDteStatus,
    parseItemName,
    shouldDeleteTrackedItem,
} = require('../services/automation/dteSyncService');
const { recoverJsonObject } = require('../scripts/importLegacyDteState');

test('DTE item names and Monday labels are normalized', () => {
    assert.deepEqual(parseItemName('FE 2655'), {
        prefix: 'FE',
        typeDocument: 33,
        folio: 2655,
    });
    assert.deepEqual(parseItemName('nv1529'), {
        prefix: 'NV',
        typeDocument: 1001,
        folio: 1529,
    });
    assert.equal(parseItemName('unrelated item'), null);
    assert.equal(mapDocumentType({ type_document: 39 }), 'Boleta');
    assert.equal(mapDteStatus({ status: 'paid' }), 'Pagado');
});

test('legacy importer salvages complete entries and identifies the truncated DTE', () => {
    const damaged = `{
        "33-10": {"type_document":33,"folio":10,"status":"paid"},
        "39-20": {"type_document":39,"folio":20,"boardId":123,"itemId":456,"status":"pend`;
    const recovered = recoverJsonObject(damaged);
    assert.deepEqual(Object.keys(recovered.value), ['33-10']);
    assert.deepEqual(recovered.truncatedKey, { typeDocument: 39, folio: 20 });
    assert.deepEqual(recovered.truncatedItem, {
        type_document: 39,
        folio: 20,
        boardId: 123,
        itemId: 456,
    });
});

test('tracked DTE retention matches the previous policy', () => {
    const now = new Date('2026-09-01T12:00:00Z');
    assert.equal(shouldDeleteTrackedItem({
        relbase_status: 'paid',
        start_date: '2026-08-20',
        end_date: '2026-09-10',
    }, now), true);
    assert.equal(shouldDeleteTrackedItem({
        relbase_status: 'pending',
        start_date: '2026-08-20',
        end_date: '2026-08-15',
    }, now), false);
});
