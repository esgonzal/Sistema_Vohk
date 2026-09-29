import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface AvailableTtlockDevice {
  lockId: number;
  keyId?: number;
  lockAlias?: string;
  lockName?: string;
  lockMac?: string;
  electricQuantity?: number;
  keyboardPwdVersion?: number;
  hasGateway: boolean;
  remoteEnabled: boolean;
  keyRight?: number;
  userType?: string;
  suggestedDeviceType: 'lock' | 'gate';
}

@Injectable({
  providedIn: 'root'
})
export class DeviceService {

  URL = 'https://api.vohk.cl';
  //URL = 'http://localhost:8080';

  constructor(private http: HttpClient) { }

  getDeviceTree(condominiumId: string) {
    return this.http.get<any>(`${this.URL}/api/devices/condominium/${condominiumId}`);
  }

  getAvailableTtlockDevices() {
    return this.http.get<AvailableTtlockDevice[]>(`${this.URL}/api/devices/ttlock/available`);
  }

  createDevice(deviceData: any, intercomData: any = null, ttlockData: any = null) {
    return this.http.post<any>(`${this.URL}/api/devices/`, { deviceData, intercomData, ttlockData });
  }

  updateDeviceName(deviceId: string, name: string) {
    return this.http.put(`${this.URL}/api/devices/${deviceId}/name`, { name });
  }

  updateDeviceZone(deviceId: string, zoneId: string) {
    return this.http.put(`${this.URL}/api/devices/${deviceId}/zone`, { zoneId });
  }

  refreshIdentity(deviceId: string) {
    return this.http.post(`${this.URL}/api/devices/${deviceId}/identity/refresh`, {});
  }

  refreshTtlock(deviceId: string) {
    return this.http.post(`${this.URL}/api/devices/${deviceId}/ttlock-refresh`, {});
  }

  provisionResidents(deviceId: string) {
    return this.http.post<any>(`${this.URL}/api/devices/${deviceId}/provision-residents`, {});
  }

  deleteDevice(deviceId: string) {
    return this.http.delete(`${this.URL}/api/devices/${deviceId}`);
  }
}
