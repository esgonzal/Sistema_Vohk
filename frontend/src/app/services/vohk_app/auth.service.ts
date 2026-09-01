import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { firstValueFrom, Observable } from 'rxjs';

interface LoginResponse {
  success: boolean;
  token: string;
  user: { userId: string; tenantId: string; username: string; role: string; identity: string; };
  legalName: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  URL = 'https://api.vohk.cl';
  //URL = 'http://localhost:8080';

  constructor(private http: HttpClient) { }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.URL}/api/auth/login`, { username, password }).pipe(
      tap(response => {
        localStorage.setItem('jwt', response.token);
        localStorage.setItem('userId', response.user.userId);
        localStorage.setItem('username', response.user.username);
        localStorage.setItem('role', response.user.role);
        localStorage.setItem('identity', response.user.identity);
        localStorage.setItem('legalName', response.legalName);
      })
    );
  }

  getTwilioToken(): Observable<{ token: string }> {
    return this.http.get<{ token: string }>(`${this.URL}/api/auth/token`);
  }

  resetPassword(data: any): Promise<any> {
    return firstValueFrom(this.http.post(`${this.URL}/api/auth/reset-password`, data));
  }

  logout(): void {
    localStorage.removeItem('jwt');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('identity');
    localStorage.removeItem('selectedCondominiumId');
    localStorage.removeItem('legalName');
    localStorage.removeItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('jwt');
  }

  getRole(): string | null {
    return localStorage.getItem('role');
  }

  isLoggedIn(): boolean {
    return this.getToken() !== null;
  }
}