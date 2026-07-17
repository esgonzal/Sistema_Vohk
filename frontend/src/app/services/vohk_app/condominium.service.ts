import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class CondominiumService {

  //URL = 'https://api.vohk.cl';
  URL = 'http://localhost:8080';

  constructor(private http: HttpClient) { }

  getCondominiums() {
    return this.http.get<any>(`${this.URL}/app/condominium/condominium-tree`);
  }
  createCondominium(name: string, address: string, city: string) {
    return this.http.post(`${this.URL}/app/condominium/create`, { name, address, city });
  }
  updateCondominium(condominiumId: string, data: any) {
    return this.http.put(`${this.URL}/app/condominium/${condominiumId}`, data);
  }
  deleteCondominium(condominiumId: string) {
    return this.http.delete(`${this.URL}/app/condominium/${condominiumId}`);
  }
  createBuilding(condominiumId: string, name: string, floorCount: number) {
    return this.http.post(`${this.URL}/app/condominium/create-building`, { condominiumId, name, floorCount });
  }
  updateBuilding(buildingId: string, data: any) {
    return this.http.put(`${this.URL}/app/condominium/edit-building/${buildingId}`, data);
  }
  deleteBuilding(buildingId: string) {
    return this.http.delete(`${this.URL}/app/condominium/delete-building/${buildingId}`);
  }
  createZone(condominiumId: string, name: string) {
    return this.http.post(`${this.URL}/app/condominium/create-zone/${condominiumId}`, { name });
  }
  updateZone(zoneId: string, data: any) {
    return this.http.put(`${this.URL}/app/condominium/edit-zone/${zoneId}`, data);
  }
  deleteZone(zoneId: string) {
    return this.http.delete(`${this.URL}/app/condominium/delete-zone/${zoneId}`);
  }
}
