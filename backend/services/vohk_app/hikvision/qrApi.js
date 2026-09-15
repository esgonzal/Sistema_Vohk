const { randomUUID } = require('node:crypto');

// Separate from general fetchJson: QR calls are bounded and are never retried.
async function request(adapter, endpoint, body) {
    const response = await adapter.fetch(endpoint, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(12000),
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }
    return { ok: response.ok, status: response.status, data };
}

function getCapabilities(adapter) {
    return request(adapter, '/ISAPI/AccessControl/QRCodeInfo/capabilities?format=json');
}

function findPerson(adapter, employeeNo) {
    return request(adapter, '/ISAPI/AccessControl/UserInfo/Search?format=json', {
        UserInfoSearchCond: { searchID: randomUUID(), searchResultPosition: 0, maxResults: 1,
            EmployeeNoList: [{ employeeNo }] },
    });
}

function issue(adapter, employeeNo, valid, times) {
    return request(adapter, '/ISAPI/AccessControl/QRCodeInfo?format=json', {
        QRCodeInfoCond: { employeeNo, valid, times },
    });
}

module.exports = { getCapabilities, findPerson, issue };
