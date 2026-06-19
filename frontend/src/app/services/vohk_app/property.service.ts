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
    return this.http.get<any[]>(this.URL + '/app/admin/condominiums');
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
  createCondominium(tenantId: string, name: string, address: string, city: string) {
    return this.http.post(`${this.URL}/app/admin/condominiums`, { tenantId, name, address, city });
  }
  createBuilding(condominiumId: string, name: string, floorCount: number) {
    return this.http.post(`${this.URL}/app/admin/buildings`, { condominiumId, name, floorCount });
  }
  createUnit(buildingId: string, name: string, roomNo: string, floor: number) {
    return this.http.post(`${this.URL}/app/admin/units`, { buildingId, name, roomNo, floor });
  }
  createResident(unitId: string, username: string, password: string, identity: string, email: string, legalName: string, isPrimary: boolean) {
    return this.http.post(`${this.URL}/app/admin/units/${unitId}/residents`, { username, password, identity, email, legalName, isPrimary });
  }
  deleteCondominium(condominiumId: string) {
    return this.http.delete(`${this.URL}/app/admin/condominiums/${condominiumId}`);
  }
  deleteBuilding(buildingId: string) {
    return this.http.delete(`${this.URL}/app/admin/buildings/${buildingId}`);
  }
  deleteUnit(unitId: string) {
    return this.http.delete(`${this.URL}/app/admin/units/${unitId}`);
  }
  deleteResident(userId: string) {
    return this.http.delete(`${this.URL}/app/admin/residents/${userId}`);
  }
  updateCondominium(condominiumId: string, data: any) {
    return this.http.put(`${this.URL}/app/admin/condominiums/${condominiumId}`, data);
  }
  updateBuilding(buildingId: string, data: any) {
    return this.http.put(`${this.URL}/app/admin/buildings/${buildingId}`, data);
  }
  updateUnit(UnitId: string, data: any) {
    return this.http.put(`${this.URL}/app/admin/units/${UnitId}`, data);
  }
  updateResidente(userId: string, data: any) {
    return this.http.put(`${this.URL}/app/admin/residents/${userId}`, data);
  }
  getDevicesByCondominium(condominiumId: string) {
    return this.http.get<any[]>(`${this.URL}/app/device/location?condominiumId=${condominiumId}`);
  }
  createDevice(data: any) {
    return this.http.post(`${this.URL}/app/device`, data);
  }
  updateDevice(deviceId: string, data: any) {
    return this.http.put(`${this.URL}/app/device/${deviceId}`, data);
  }
  deleteDevice(deviceId: string) {
    return this.http.delete(`${this.URL}/app/device/${deviceId}`);
  }
}