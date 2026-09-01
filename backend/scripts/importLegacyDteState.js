require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../database/db');
const repository = require('../repositories/dteSyncRepository');

const DATA_DIRECTORY = path.join(__dirname, '../data');

function recoverJsonObject(text) {
    try {
        return { value: JSON.parse(text), truncatedKey: null, truncatedItem: null };
    } catch (originalError) {
        const incompleteTail = text.slice(Math.max(0, text.lastIndexOf('},') + 2));
        const keyMatch = incompleteTail.match(/"(33|39|1001)-(\d+)"/);
        const numericField = name => {
            const match = incompleteTail.match(new RegExp(`"${name}"\\s*:\\s*"?(\\d+)"?`));
            return match ? Number(match[1]) : null;
        };
        const truncatedItem = keyMatch ? {
            type_document: numericField('type_document') ?? Number(keyMatch[1]),
            folio: numericField('folio') ?? Number(keyMatch[2]),
            boardId: numericField('boardId'),
            itemId: numericField('itemId'),
        } : null;
        for (let index = text.length - 1; index > 0; index -= 1) {
            if (text[index] !== '}') continue;
            const candidate = `${text.slice(0, index + 1).replace(/,\s*$/, '')}\n}`;
            try {
                return {
                    value: JSON.parse(candidate),
                    truncatedKey: keyMatch ? {
                        typeDocument: Number(keyMatch[1]),
                        folio: Number(keyMatch[2]),
                    } : null,
                    truncatedItem,
                };
            } catch {
                // Continue backwards until the last complete top-level entry.
            }
        }
        throw originalError;
    }
}

async function importLegacyDteState() {
    const watchlistText = fs.readFileSync(path.join(DATA_DIRECTORY, 'watchlist.json'), 'utf8');
    const folios = JSON.parse(fs.readFileSync(path.join(DATA_DIRECTORY, 'last_folios.json'), 'utf8'));
    const recovered = recoverJsonObject(watchlistText);
    let imported = 0;
    for (const [key, item] of Object.entries(recovered.value)) {
        const [typeText, folioText] = key.split('-');
        const typeDocument = Number(item.type_document ?? typeText);
        const folio = Number(item.folio ?? folioText);
        await repository.savePending({
            typeDocument,
            folio,
            boardId: item.boardId,
            mondayItemId: item.itemId,
            dte: {
                type_document: typeDocument,
                folio,
                status: item.status,
                start_date: item.start_date,
                end_date: item.end_date,
            },
        });
        await repository.markSynced(typeDocument, folio, item);
        imported += 1;
    }
    let recoveredPartial = false;
    if (recovered.truncatedItem?.boardId && recovered.truncatedItem?.itemId) {
        const item = recovered.truncatedItem;
        await repository.savePending({
            typeDocument: item.type_document,
            folio: item.folio,
            boardId: item.boardId,
            mondayItemId: item.itemId,
            dte: { type_document: item.type_document, folio: item.folio },
        });
        await repository.markSynced(item.type_document, item.folio, item);
        imported += 1;
        recoveredPartial = true;
    }
    for (const [typeText, lastFolio] of Object.entries(folios)) {
        const typeDocument = Number(typeText);
        let safeFolio = Number(lastFolio);
        if (!recoveredPartial
            && recovered.truncatedKey?.typeDocument === typeDocument
            && safeFolio >= recovered.truncatedKey.folio) {
            safeFolio = recovered.truncatedKey.folio - 1;
        }
        await repository.setCursor(typeDocument, safeFolio);
    }
    return { imported, recoveredPartial, truncatedKey: recovered.truncatedKey };
}

if (require.main === module) {
    importLegacyDteState()
        .then(result => console.log('[DTE IMPORT]', JSON.stringify(result)))
        .catch(error => {
            console.error('[DTE IMPORT]', error.stack || error);
            process.exitCode = 1;
        })
        .finally(() => pool.end());
}

module.exports = { importLegacyDteState, recoverJsonObject };
