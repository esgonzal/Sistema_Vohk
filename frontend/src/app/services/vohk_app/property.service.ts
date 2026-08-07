import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  URL = 'https://api.vohk.cl';
  //URL = 'http://localhost:8080';

  constructor(private http: HttpClient) { }

  getCondominiums() {
    return this.http.get<any[]>(this.URL + '/api/admin/condominiums');
  }
  getZones(condominiumId: string) {
    return this.http.get<any[]>(`${this.URL}/api/admin/condominiums/${condominiumId}/zones`);
  }
  getBuildings(condominiumId: string) {
    return this.http.get<any[]>(`${this.URL}/api/admin/condominiums/${condominiumId}/buildings`);
  }
  getUnits(buildingId: string) {
    return this.http.get<any[]>(`${this.URL}/api/admin/buildings/${buildingId}/units`);
  }
  getResidents(UnitId: string) {
    return this.http.get<any[]>(`${this.URL}/api/admin/units/${UnitId}/residents`);
  }
  createDevice(data: any) {
    return this.http.post(`${this.URL}/api/devices`, data);
  }
  updateDevice(deviceId: string, data: any) {
    return this.http.put(`${this.URL}/api/devices/${deviceId}`, data);
  }
  updateResident(userId: string, unitId: string, data: any) {
    return this.http.put(`${this.URL}/api/admin/residents/${userId}`, { unitId, ...data });
  }
  deleteDevice(deviceId: string) {
    return this.http.delete(`${this.URL}/api/devices/${deviceId}`);
  }
  deleteResident(userId: string, unitId: string) {
    return this.http.delete(`${this.URL}/api/admin/residents/${userId}/units/${unitId}`);
  }
}