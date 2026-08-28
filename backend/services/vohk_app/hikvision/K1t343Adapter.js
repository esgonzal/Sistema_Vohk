const { v4: uuid } = require('uuid');
const HikvisionAdapter = require('./HikvisionAdapter');

class K1t343Adapter extends HikvisionAdapter {
    constructor(intercom, client) {
        super(intercom, client);
        this.profile = 'hikvision-minmoe-k1t343-v4';
        this.supportsStoredAccessEvents = true;
    }

    buildCallNumber(roomNumber) {
        const period = this.intercom.dial_period_number || 1;
        const building = this.intercom.dial_building_number || 1;
        const unit = this.intercom.dial_unit_number || 1;
        return `${period}-${building}-${unit}-${roomNumber}`;
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
            doorRight: String(this.intercom.door_id || 1),
            roomNumber: Number(roomNumber),
            floorNumber: Number(floorNumber),
            floorNumbers: [Number(floorNumber)],
            callNumbers: [this.buildCallNumber(roomNumber)],
        };
    }

    buildVisitorUserInfo(options) {
        return {
            ...super.buildVisitorUserInfo(options),
            userVerifyMode: 'faceOrPw',
        };
    }

    setPin(employeeNo, dynamicCode) {
        if (dynamicCode === '') {
            const error = new Error('Clearing a PIN on DS-K1T343 devices requires a validated device-specific method');
            error.status = 501;
            throw error;
        }
        return super.setPin(employeeNo, dynamicCode);
    }

    buildPhoneRecord(roomNo, phoneNumbers) {
        return {
            PhoneNumberRecord: {
                periodNumber: this.intercom.dial_period_number || 1,
                buildingNumber: this.intercom.dial_building_number || 1,
                unitNumber: this.intercom.dial_unit_number || 1,
                roomNo: String(roomNo),
                PhoneNumbers: phoneNumbers.map(phoneNumber => ({ phoneNumber: String(phoneNumber) })),
            },
        };
    }

    async updatePhoneRecord(recordId, roomNo, phoneNumbers) {
        const deleted = await this.deletePhoneRecord(recordId);
        if (!deleted.ok) return deleted;
        return this.createPhoneRecord(roomNo, phoneNumbers);
    }

    async deleteFace(employeeNo) {
        const { data: searchData } = await this.searchFaces(employeeNo, 1);
        const match = searchData.MatchList?.[0] || searchData.FDSearchResult?.MatchList?.[0];
        const faceRecord = match?.faceURL || match || null;
        const entry = { value: employeeNo };
        const rowKey = faceRecord?.rowKey || match?.rowKey;
        if (rowKey) entry.rowKey = rowKey;
        const payload = {
            FPID: [entry],
            operateType: 'byTerminal',
            terminalNoList: [1],
        };
        const { data } = await this.fetchJson(
            '/ISAPI/Intelligent/FDLib/FDSearch/Delete?format=json&FDID=1&faceLibType=blackFD',
            'PUT',
            payload,
        );
        return data;
    }

    async searchAccessEvents({
        position = 0,
        maxResults = 30,
        major = 5,
        minor = 0,
        startTime,
        endTime,
        picEnable = false,
        timeReverseOrder = true,
    } = {}) {
        const condition = {
            searchID: uuid().replace(/-/g, ''),
            searchResultPosition: position,
            maxResults: Math.min(Math.max(Number(maxResults) || 30, 1), 30),
            major: Number(major),
            minor: Number(minor),
            picEnable: Boolean(picEnable),
        };
        if (startTime) condition.startTime = startTime;
        if (endTime) condition.endTime = endTime;
        if (timeReverseOrder) condition.timeReverseOrder = true;
        const { response, data } = await this.fetchJson(
            '/ISAPI/AccessControl/AcsEvent?format=json',
            'POST',
            { AcsEventCond: condition },
        );
        return { ok: response.ok && Boolean(data.AcsEvent), status: response.status, data: data.AcsEvent || data };
    }
}

module.exports = K1t343Adapter;
