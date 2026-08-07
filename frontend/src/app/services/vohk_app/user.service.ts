import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  URL = 'https://api.vohk.cl';
  //URL = 'http://localhost:8080';

  constructor(private http: HttpClient) { }

  getUsers(condominiumId: string) {
    return this.http.get<any[]>(`${this.URL}/api/users/${condominiumId}`);
  }
  createResident(unitId: string, legalName: string, rut: string, email: string, isPrimary: boolean) {
    return this.http.post(`${this.URL}/api/users/${unitId}`, { legalName, rut, email, isPrimary });
  }
  updateResident(residentId: string, unitId: string, legalName: string, email: string, isPrimary: boolean) {
    return this.http.put(`${this.URL}/api/users/residents/${residentId}`, { unitId, legalName, email, isPrimary });
  }
  deleteResident(residentId: string, unitId: string) {
    return this.http.delete(`${this.URL}/api/users/residents/${residentId}/units/${unitId}`);
  }

}