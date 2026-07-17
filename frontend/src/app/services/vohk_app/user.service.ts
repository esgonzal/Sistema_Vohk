import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  //URL = 'https://api.vohk.cl';
  URL = 'http://localhost:8080';

  constructor(
    private http: HttpClient
  ) { }

  getUsers(condominiumId: string) {
    return this.http.get<any[]>(`${this.URL}/app/user/${condominiumId}`);
  }

}