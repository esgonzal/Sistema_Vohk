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

function getAccessControlCapabilities(adapter) {
    return request(adapter, '/ISAPI/AccessControl/capabilities?format=json');
}

function getEncryptionCapabilities(adapter) {
    return request(adapter, '/ISAPI/AccessControl/QRCodeEncryption/capabilities?format=json');
}

function getEncryptionConfiguration(adapter) {
    return request(adapter, '/ISAPI/AccessControl/QRCodeEncryption?format=json');
}

function getAccessControlConfiguration(adapter) {
    return request(adapter, '/ISAPI/AccessControl/AcsCfg?format=json');
}

function configureEncryption(adapter, key, vector) {
    return adapter.fetch('/ISAPI/AccessControl/QRCodeEncryption?format=json', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ QRCodeEncryption: { encryptType: 'AES128_CBC', key, vector } }),
        signal: AbortSignal.timeout(12000),
    }).then(async response => {
        const text = await response.text();
        let data;
        try { data = JSON.parse(text); } catch { data = null; }
        return { ok: response.ok, status: response.status, data };
    });
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

module.exports = {
    getCapabilities,
    getAccessControlCapabilities,
    getEncryptionCapabilities,
    getEncryptionConfiguration,
    getAccessControlConfiguration,
    configureEncryption,
    findPerson,
    issue,
};
