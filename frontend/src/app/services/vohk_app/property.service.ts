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

  createCondominium(tenantId: string, name: string, address: string, city: string) {
    return this.http.post(`${this.URL}/app/admin/condominiums`, { tenantId, name, address, city });
  }
  createZone(condominiumId: string, name: string) {
    return this.http.post(`${this.URL}/app/admin/zones`, { condominiumId, name });
  }
  createDevice(data: any) {
    return this.http.post(`${this.URL}/app/device`, data);
  }
  createBuilding(condominiumId: string, name: string, floorCount: number) {
    return this.http.post(`${this.URL}/app/admin/buildings`, { condominiumId, name, floorCount });
  }
  createUnit(buildingId: string, name: string, roomNo: string, floor: number) {
    return this.http.post(`${this.URL}/app/admin/units`, { buildingId, name, roomNo, floor });
  }
  createResident(unitId: string, legalName: string, rut: string, email: string, isPrimary: boolean) {
    return this.http.post(`${this.URL}/app/admin/units/${unitId}/residents`, { legalName, rut, email, isPrimary });
  }

  updateCondominium(condominiumId: string, data: any) {
    return this.http.put(`${this.URL}/app/admin/condominiums/${condominiumId}`, data);
  }
  updateZone(zoneId: string, data: any) {
    return this.http.put(`${this.URL}/app/admin/zones/${zoneId}`, data);
  }
  updateDevice(deviceId: string, data: any) {
    return this.http.put(`${this.URL}/app/device/${deviceId}`, data);
  }
  updateBuilding(buildingId: string, data: any) {
    return this.http.put(`${this.URL}/app/admin/buildings/${buildingId}`, data);
  }
  updateUnit(UnitId: string, data: any) {
    return this.http.put(`${this.URL}/app/admin/units/${UnitId}`, data);
  }
  updateResident(userId: string, unitId: string, data: any) {
    return this.http.put(`${this.URL}/app/admin/residents/${userId}`, { unitId, ...data });
  }

  deleteCondominium(condominiumId: string) {
    return this.http.delete(`${this.URL}/app/admin/condominiums/${condominiumId}`);
  }
  deleteZone(zoneId: string) {
    return this.http.delete(`${this.URL}/app/admin/zones/${zoneId}`);
  }
  deleteDevice(deviceId: string) {
    return this.http.delete(`${this.URL}/app/device/${deviceId}`);
  }
  deleteBuilding(buildingId: string) {
    return this.http.delete(`${this.URL}/app/admin/buildings/${buildingId}`);
  }
  deleteUnit(unitId: string) {
    return this.http.delete(`${this.URL}/app/admin/units/${unitId}`);
  }
  deleteResident(userId: string, unitId: string) {
    return this.http.delete(`${this.URL}/app/admin/residents/${userId}/units/${unitId}`);
  }
}