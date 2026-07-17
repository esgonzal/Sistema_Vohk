import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  //URL = 'https://api.vohk.cl';
  URL = 'http://localhost:8080';

  constructor(private http: HttpClient) { }

  getCondominiums() {
    return this.http.get<any[]>(this.URL + '/app/admin/condominiums');
  }
  getZones(condominiumId: string) {
    return this.http.get<any[]>(`${this.URL}/app/admin/condominiums/${condominiumId}/zones`);
  }
  getDevices(condominiumId: string) {
    return this.http.get<any[]>(`${this.URL}/app/device/location?condominiumId=${condominiumId}`);
  }
  getBuildings(condominiumId: string) {
    return this.http.get<any[]>(`${this.URL}/app/admin/condominiums/${condominiumId}/buildings`);
  }
  getUnits(buildingId: string) {
    return this.http.get<any[]>(`${this.URL}/app/admin/buildings/${buildingId}/units`);
  }
  getResidents(UnitId: string) {
    return this.http.get<any[]>(`${this.URL}/app/admin/units/${UnitId}/residents`);
  }
  getUnitTree(condominiumId: string) {
    return this.http.get<any[]>(this.URL + `/app/admin/unit-tree/${condominiumId}`);
  }
  createDevice(data: any) {
    return this.http.post(`${this.URL}/app/device`, data);
  }
  createUnit(buildingId: string, name: string, roomNo: string, floor: number) {
    return this.http.post(`${this.URL}/app/admin/units`, { buildingId, name, roomNo, floor });
  }
  createResident(unitId: string, legalName: string, rut: string, email: string, isPrimary: boolean) {
    return this.http.post(`${this.URL}/app/admin/units/${unitId}/residents`, { legalName, rut, email, isPrimary });
  }

  updateDevice(deviceId: string, data: any) {
    return this.http.put(`${this.URL}/app/device/${deviceId}`, data);
  }
  updateUnit(UnitId: string, data: any) {
    return this.http.put(`${this.URL}/app/admin/units/${UnitId}`, data);
  }
  updateResident(userId: string, unitId: string, data: any) {
    return this.http.put(`${this.URL}/app/admin/residents/${userId}`, { unitId, ...data });
  }

  deleteDevice(deviceId: string) {
    return this.http.delete(`${this.URL}/app/device/${deviceId}`);
  }
  deleteUnit(unitId: string) {
    return this.http.delete(`${this.URL}/app/admin/units/${unitId}`);
  }
  deleteResident(userId: string, unitId: string) {
    return this.http.delete(`${this.URL}/app/admin/residents/${userId}/units/${unitId}`);
  }
}