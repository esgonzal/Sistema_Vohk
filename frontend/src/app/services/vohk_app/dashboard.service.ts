import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  //URL = 'https://api.vohk.cl';
  URL = 'http://localhost:8080';

  constructor(private http: HttpClient) { }

  getDashboard() {
    return this.http.get<any>(`${this.URL}/app/dashboard`);
  }
  getCondominiums() {
    return this.http.get<any>(`${this.URL}/app/admin/condominium-tree`);
  }
}
