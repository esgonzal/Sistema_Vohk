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
  createManagementUser(legalName: string, rut: string, email: string, role: 'admin' | 'staff', condominiumId?: string) {
    return this.http.post<{
      user: { user_id: string; username: string; legal_name: string; email: string; role: string };
      temporaryPassword: string;
    }>(`${this.URL}/api/users/management`, { legalName, rut, email, role, ...(condominiumId ? { condominiumId } : {}) });
  }
  createResident(unitId: string, legalName: string, rut: string, email: string, isPrimary: boolean) {
    return this.http.post(`${this.URL}/api/users/${unitId}`, { legalName, rut, email, isPrimary });
  }
  createResidentsBulk(condominiumId: string, residents: Array<{
    row: number;
    legalName: string;
    rut: string;
    email: string;
    building: string;
    unit: string;
    isPrimary: boolean;
  }>) {
    return this.http.post<{
      total: number;
      succeeded: number;
      failed: number;
      results: Array<{ row: number; legalName: string; success: boolean; building?: string; unit?: string; error?: string }>;
    }>(`${this.URL}/api/users/residents/bulk`, { condominiumId, residents });
  }
  updateResident(residentId: string, unitId: string, legalName: string, email: string, isPrimary: boolean) {
    return this.http.put(`${this.URL}/api/users/residents/${residentId}`, { unitId, legalName, email, isPrimary });
  }
  deleteResident(residentId: string, unitId: string) {
    return this.http.delete(`${this.URL}/api/users/residents/${residentId}/units/${unitId}`);
  }

}
