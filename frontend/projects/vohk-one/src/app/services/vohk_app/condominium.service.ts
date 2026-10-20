import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class CondominiumService {

  URL = 'https://api.vohk.cl';
  //URL = 'http://localhost:8080';

  constructor(private http: HttpClient) { }

  getCondominiums() {
    return this.http.get<any>(`${this.URL}/api/condominiums/tree`);
  }
  updateResidentCameraAccess(condominiumId: string, enabled: boolean) {
    return this.http.put(`${this.URL}/api/condominiums/${condominiumId}/resident-camera-access`, { enabled });
  }
  getInvitationSettings(condominiumId: string) {
    return this.http.get<any>(`${this.URL}/api/condominiums/${condominiumId}/invitation-settings`);
  }
  updateInvitationSettings(condominiumId: string, settings: any) {
    return this.http.put<any>(`${this.URL}/api/condominiums/${condominiumId}/invitation-settings`, settings);
  }
  getStaffShifts(condominiumId: string) {
    return this.http.get<any>(`${this.URL}/api/condominiums/${condominiumId}/staff-shifts`);
  }
  createStaffShift(condominiumId: string, shift: any) {
    return this.http.post<any>(`${this.URL}/api/condominiums/${condominiumId}/staff-shifts`, shift);
  }
  updateStaffShift(shiftId: string, shift: any) {
    return this.http.put<any>(`${this.URL}/api/condominiums/staff-shifts/${shiftId}`, shift);
  }
  deleteStaffShift(shiftId: string) {
    return this.http.delete(`${this.URL}/api/condominiums/staff-shifts/${shiftId}`);
  }
  createCondominium(name: string, address: string, city: string) {
    return this.http.post(`${this.URL}/api/condominiums/`, { name, address, city });
  }
  updateCondominium(condominiumId: string, data: any) {
    return this.http.put(`${this.URL}/api/condominiums/${condominiumId}`, data);
  }
  deleteCondominium(condominiumId: string) {
    return this.http.delete(`${this.URL}/api/condominiums/${condominiumId}`);
  }
  createBuilding(condominiumId: string, name: string, floorCount: number) {
    return this.http.post(`${this.URL}/api/condominiums/${condominiumId}/buildings`, { name, floorCount });
  }
  updateBuilding(buildingId: string, data: any) {
    return this.http.put(`${this.URL}/api/condominiums/buildings/${buildingId}`, data);
  }
  deleteBuilding(buildingId: string) {
    return this.http.delete(`${this.URL}/api/condominiums/buildings/${buildingId}`);
  }
  createZone(condominiumId: string, name: string) {
    return this.http.post(`${this.URL}/api/condominiums/${condominiumId}/zones`, { name });
  }
  updateZone(zoneId: string, data: any) {
    return this.http.put(`${this.URL}/api/condominiums/zones/${zoneId}`, data);
  }
  deleteZone(zoneId: string) {
    return this.http.delete(`${this.URL}/api/condominiums/zones/${zoneId}`);
  }
}
