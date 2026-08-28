const { v4: uuid } = require('uuid');

class HikvisionAdapter {
    constructor(intercom, client) {
        this.intercom = intercom;
        this.client = client;
        this.profile = 'hikvision-video-intercom-v2';
        this.supportsStoredAccessEvents = false;
    }

    get baseUrl() {
        return `http://${this.intercom.ip_address}:${this.intercom.port}`;
    }

    url(path) {
        return `${this.baseUrl}${path}`;
    }

    async fetch(path, options = {}) {
        return this.client.fetch(this.url(path), options);
    }

    async fetchJson(path, method, payload) {
        const response = await this.fetch(path, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: payload === undefined ? undefined : JSON.stringify(payload),
        });
        const text = await response.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch (_) {
            data = { raw: text };
        }
        return { response, data, text };
    }

    async openDoor(doorId) {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
            `<RemoteControlDoor version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">` +
            `<cmd>open</cmd></RemoteControlDoor>`;
        const response = await this.fetch(`/ISAPI/AccessControl/RemoteControl/door/${doorId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/xml' },
            body: xml,
        });
        return { response, text: await response.text() };
    }

    userSearchCondition({ employeeNo = null, position = 0, maxResults = 30, searchID = uuid() } = {}) {
        const condition = { searchID, searchResultPosition: position, maxResults };
        if (employeeNo) condition.EmployeeNoList = [{ employeeNo }];
        return { UserInfoSearchCond: condition };
    }

    searchUsers(options = {}) {
        return this.fetchJson(
            '/ISAPI/AccessControl/UserInfo/Search?format=json',
            'POST',
            this.userSearchCondition(options),
        );
    }

    buildResidentUserInfo({ employeeNo, dynamicCode, name, roomNumber, floorNumber = 1 }) {
        return {
            employeeNo,
            dynamicCode,
            name,
            userType: 'normal',
            Valid: {
                enable: true,
                beginTime: '2000-01-01T00:00:00',
                endTime: '2037-12-31T23:59:59',
                timeType: 'local',
            },
            roomNumber,
            floorNumber,
            floorNumbers: [Number(floorNumber)],
            callNumbers: [String(roomNumber)],
        };
    }

    buildResidentUserUpdate({ employeeNo, name, roomNumber, floorNumber = 1 }) {
        return this.buildResidentUserInfo({ employeeNo, name, roomNumber, floorNumber });
    }

    buildVisitorUserInfo({ invitation, visitorName, employeeNo, dynamicCode }) {
        return {
            employeeNo,
            name: visitorName,
            userType: 'visitor',
            Valid: invitation.valid,
            dynamicCode,
            doorRight: String(this.intercom.door_id || 1),
            userVerifyMode: 'cardOrPw',
        };
    }

    createUser(userInfo) {
        return this.fetchJson('/ISAPI/AccessControl/UserInfo/Record?format=json', 'POST', { UserInfo: userInfo });
    }

    updateUser(userInfo) {
        return this.fetchJson('/ISAPI/AccessControl/UserInfo/Modify?format=json', 'PUT', { UserInfo: userInfo });
    }

    deleteUser(employeeNo) {
        return this.fetchJson('/ISAPI/AccessControl/UserInfo/Delete?format=json', 'PUT', {
            UserInfoDelCond: { EmployeeNoList: [{ employeeNo }] },
        });
    }

    setPin(employeeNo, dynamicCode) {
        return this.updateUser({ employeeNo, dynamicCode });
    }

    searchCards({ position = 0, maxResults = 30, searchID = uuid() } = {}) {
        return this.fetchJson('/ISAPI/AccessControl/CardInfo/Search?format=json', 'POST', {
            CardInfoSearchCond: { searchID, searchResultPosition: position, maxResults },
        });
    }

    createCard(employeeNo, cardNo) {
        return this.fetchJson('/ISAPI/AccessControl/CardInfo/Record?format=json', 'POST', {
            CardInfo: { employeeNo, cardNo, cardType: 'normalCard' },
        });
    }

    updateCard(employeeNo, cardNo) {
        return this.fetchJson('/ISAPI/AccessControl/CardInfo/Modify?format=json', 'PUT', {
            CardInfo: { employeeNo, cardNo, cardType: 'normalCard' },
        });
    }

    deleteCard(cardNo) {
        return this.fetchJson('/ISAPI/AccessControl/CardInfo/Delete?format=json', 'PUT', {
            CardInfoDelCond: { CardNoList: [{ cardNo }] },
        });
    }

    async enrollFace(body, boundary) {
        const response = await this.fetch('/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json', {
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': body.length,
            },
            body,
        });
        return response.json();
    }

    searchFaces(employeeNo, maxResults = 1) {
        return this.fetchJson('/ISAPI/Intelligent/FDLib/FDSearch?format=json', 'POST', {
            searchID: uuid().replace(/-/g, ''),
            searchResultPosition: 0,
            maxResults,
            FDID: '1',
            faceLibType: 'blackFD',
            FPID: employeeNo,
        });
    }

    async deleteFace(employeeNo) {
        const payload = { FPID: [{ value: employeeNo }] };
        const { data } = await this.fetchJson(
            '/ISAPI/Intelligent/FDLib/FDSearch/Delete?format=json&FDID=1&faceLibType=blackFD',
            'PUT',
            payload,
        );
        return data;
    }

    buildPhoneRecord(roomNo, phoneNumbers) {
        return {
            PhoneNumberRecord: {
                roomNo: String(roomNo),
                PhoneNumbers: phoneNumbers.map(phoneNumber => ({ phoneNumber: String(phoneNumber) })),
            },
        };
    }

    async searchPhoneRecords() {
        const records = [];
        const searchID = uuid().replace(/-/g, '');
        let position = 0;
        let lastData = null;
        for (let page = 0; page < 100; page += 1) {
            const { response, data } = await this.fetchJson(
                '/ISAPI/VideoIntercom/PhoneNumberRecords/phoneSearch?format=json',
                'POST',
                {
                    PhoneSearchDescription: {
                        searchID,
                        maxResults: 30,
                        searchResultPosition: position,
                        RoomNoList: [],
                    },
                },
            );
            lastData = data;
            const result = data.PhoneSearchResult;
            if (!response.ok || !result || !['OK', 'MORE', 'NO MATCH'].includes(result.responseStatusStrg)) {
                return { ok: false, status: response.status, data };
            }
            records.push(...(result.PhoneNumberRecords || []));
            if (result.responseStatusStrg !== 'MORE' || !result.numOfMatches) {
                return { ok: true, status: response.status, records, data };
            }
            position += result.numOfMatches;
        }
        return { ok: false, status: 502, data: lastData, error: 'Phone record pagination limit exceeded' };
    }

    async createPhoneRecord(roomNo, phoneNumbers) {
        const { response, data } = await this.fetchJson(
            '/ISAPI/VideoIntercom/PhoneNumberRecords?format=json',
            'POST',
            this.buildPhoneRecord(roomNo, phoneNumbers),
        );
        return { ok: response.ok && data.statusCode === 1, status: response.status, data };
    }

    async updatePhoneRecord(recordId, roomNo, phoneNumbers) {
        const { response, data } = await this.fetchJson(
            `/ISAPI/VideoIntercom/PhoneNumberRecords/${recordId}?format=json`,
            'PUT',
            this.buildPhoneRecord(roomNo, phoneNumbers),
        );
        return { ok: response.ok && data.statusCode === 1, status: response.status, data };
    }

    async deletePhoneRecord(recordId) {
        const { response, data } = await this.fetchJson(
            `/ISAPI/VideoIntercom/PhoneNumberRecords/${recordId}?format=json`,
            'DELETE',
        );
        return { ok: response.ok && data.statusCode === 1, status: response.status, data };
    }

    async searchAccessEvents() {
        const error = new Error(`Stored access events are not supported by ${this.intercom.model || 'this device'}`);
        error.status = 501;
        throw error;
    }
}

module.exports = HikvisionAdapter;
