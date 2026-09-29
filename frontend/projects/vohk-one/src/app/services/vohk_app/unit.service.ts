import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';


@Injectable({
  providedIn: 'root'
})
export class UnitService {
  URL = 'https://api.vohk.cl';
  //URL = 'http://localhost:8080';

  constructor(private http: HttpClient) { }

  getUnitTree(condominiumId: string) {
    return this.http.get<any[]>(this.URL + `/api/units/tree/${condominiumId}`);
  }
  createUnit(buildingId: string, name: string, roomNo: string, floor: number) {
    return this.http.post(`${this.URL}/api/units/`, { buildingId, name, roomNo, floor });
  }
  updateUnit(unitId: string, name: string, roomNo: string, floor: number) {
    return this.http.put(`${this.URL}/api/units/${unitId}`, { name, roomNo, floor });
  }
  deleteUnit(unitId: string) {
    return this.http.delete(`${this.URL}/api/units/${unitId}`);
  }
  createResident(unitId: string, legalName: string, rut: string, email: string, isPrimary: boolean) {
    return this.http.post(`${this.URL}/api/users/${unitId}`, { legalName, rut, email, isPrimary });
  }
  updateResident(residentId: string, unitId: string, legalName: string, email: string, isPrimary: boolean) {
    return this.http.put(`${this.URL}/api/users/${residentId}`, { unitId, legalName, email, isPrimary });
  }
  removeResident(residentId: string, unitId: string) {
    return this.http.delete<any>(`${this.URL}/api/users/residents/${residentId}/units/${unitId}`);
  }
}
