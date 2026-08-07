import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ConserjeriaService {
  URL = 'https://api.vohk.cl';
  //URL = 'http://localhost:8080';

  constructor(private http: HttpClient) { }

  getDevices(condominiumId: string) {
    return this.http.get<any[]>(`${this.URL}/api/concierge/location?condominiumId=${condominiumId}`);
  }
}
