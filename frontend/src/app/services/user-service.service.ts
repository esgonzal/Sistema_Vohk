import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Md5 } from 'ts-md5';
import { BehaviorSubject, Observable } from 'rxjs';
import { GetAccessTokenResponse, logoutResponse } from '../Interfaces/API_responses';
import { PhoneNumberUtil } from 'google-libphonenumber';


@Injectable({
  providedIn: 'root'
})
export class UserServiceService {

  URL = 'https://api.vohk.cl';
  //URL = 'http://localhost:8080';
  loggedIn = false;
  private phoneNumberUtil: PhoneNumberUtil;

  private nicknameSubject: BehaviorSubject<string> = new BehaviorSubject<string>('');
  public nickname$: Observable<string> = this.nicknameSubject.asObservable();

  constructor(private http: HttpClient) {
    this.phoneNumberUtil = PhoneNumberUtil.getInstance();
  }

  getAccessToken(nombre: string, clave: string): Observable<GetAccessTokenResponse> {
    let body = { nombre, clave };
    let url = this.URL.concat('/v0/user/login');
    return this.http.post<GetAccessTokenResponse>(url, body);
  }
  logOut(userID: string): Observable<logoutResponse> {
    let url = this.URL.concat('/v0/user/logout');
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    let options = { headers };
    let body = {
      userID
    }
    return this.http.post<logoutResponse>(url, body, options);
  }
  getMD5(clave: string) {
    return Md5.hashStr(clave);
  }
  isValidEmail(email: string): boolean {//Verifica si el nombre del destinatario es un email o no
    const emailPattern = /^[a-zA-Z0-9._-ñÑáéíóúÁÉÍÓÚ]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;

    return emailPattern.test(email);
  }
  isValidPhone(phone: string): { isValid: boolean, country?: string } {
    try {
      const phoneNumber = this.phoneNumberUtil.parse(phone);
      if (this.phoneNumberUtil.isValidNumber(phoneNumber)) {
        const country = this.phoneNumberUtil.getRegionCodeForNumber(phoneNumber);
        return { isValid: true, country };
      } else {
        return { isValid: false };
      }
    } catch (error) {
      return { isValid: false }; // Parsing error, not a valid phone number
    }
  }
  normalizePhone(phone: string): string {
    return phone.replace(/\s+/g, ''); 
  }
}