import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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

  createDevice(deviceData: any, intercomData: any = null) {
    return this.http.post(`${this.URL}/api/devices/`, { deviceData, intercomData });
  }

  updateDeviceName(deviceId: string, name: string) {
    return this.http.put(`${this.URL}/api/devices/${deviceId}/name`, { name });
  }

  updateDeviceZone(deviceId: string, zoneId: string) {
    return this.http.put(`${this.URL}/api/devices/${deviceId}/zone`, { zoneId });
  }

  deleteDevice(deviceId: string) {
    return this.http.delete(`${this.URL}/api/devices/${deviceId}`);
  }
}
