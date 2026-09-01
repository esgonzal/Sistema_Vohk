import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  URL = 'https://api.vohk.cl';
  //URL = 'http://localhost:8080';

  constructor(private http: HttpClient) { }

  getDashboard() {
    return this.http.get<any>(`${this.URL}/api/dashboard`);
  }
  getCondominiums() {
    return this.http.get<any>(`${this.URL}/api/condominiums/tree`);
  }
  getActivities(limit = 20, condominiumId?: string, eventType?: 'door_open' | 'call' | 'access') {
    const params: Record<string, string | number> = { limit };
    if (condominiumId) params['condominiumId'] = condominiumId;
    if (eventType) params['eventType'] = eventType;
    return this.http.get<any[]>(`${this.URL}/api/activities`, { params });
  }
}
