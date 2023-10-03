import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Md5 } from 'ts-md5';
import { Observable, lastValueFrom } from 'rxjs';
import { GetAccessTokenResponse, ResetPasswordResponse, UserRegisterResponse, checkUserInDBResponse, getUserInDBResponse } from '../Interfaces/API_responses';
import { PhoneNumberUtil } from 'google-libphonenumber';
import emailjs from 'emailjs-com';


@Injectable({
  providedIn: 'root'
})
export class UserServiceService {

  nombre_usuario: string;
  clave_usuario: string;
  loggedIn = false;
  private phoneNumberUtil: PhoneNumberUtil;

  constructor(private http: HttpClient) {
    this.phoneNumberUtil = PhoneNumberUtil.getInstance();
  }

  getMD5(clave: string) {
    return Md5.hashStr(clave);
  }
  customBase64Encode(input: string) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let output = '';
    let padding = 0;
    let position = 0;
    for (let i = 0; i < input.length; i++) {
      padding = (padding << 8) | input.charCodeAt(i);
      position += 8;

      while (position >= 6) {
        const index = (padding >> (position - 6)) & 0x3f;
        output += chars.charAt(index);
        position -= 6;
      }
    }
    if (position > 0) {
      const index = (padding << (6 - position)) & 0x3f;
      output += chars.charAt(index);
    }
    return output;
  }
  customBase64Decode(encoded: string): string {
    const base64Chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const base64Lookup: { [key: string]: number } = {};
    for (let i = 0; i < base64Chars.length; i++) {
      base64Lookup[base64Chars.charAt(i)] = i;
    }
    let decoded = '';
    let buffer = 0;
    let numBits = 0;
    for (let i = 0; i < encoded.length; i++) {
      const char = encoded.charAt(i);
      const value = base64Lookup[char];
      if (value === undefined) {
        // Invalid character in the encoded string
        throw new Error('Invalid character in encoded string');
      }
      buffer = (buffer << 6) | value;
      numBits += 6;
      if (numBits >= 8) {
        decoded += String.fromCharCode((buffer >> (numBits - 8)) & 0xff);
        buffer &= (1 << (numBits - 8)) - 1;
        numBits -= 8;
      }
    }
    return decoded;
  }
  isValidEmail(email: string): boolean {//Verifica si el nombre del destinatario es un email o no
    const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
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
  async isEmailNew(email: string) {//Verifica si el email de la cuenta tiene la contraseña de defecto.
    const response = await lastValueFrom(this.getAccessToken(email, 'il.com'));
    const typedResponse = response as GetAccessTokenResponse;
    if (typedResponse.access_token) {//El usuario tiene la clave de defecto
      return true;
    } else {
      return false;
    }
  }
  UserRegister(nombre: string, clave: string): Observable<UserRegisterResponse> { 
    let body = { nombre, clave };
    let url = 'http://localhost:3000/api/ttlock/user/register';
    return this.http.post<UserRegisterResponse>(url, body);
  }
  getAccessToken(nombre: string, clave: string): Observable<GetAccessTokenResponse> {
    let body = { nombre, clave };
    let url = 'http://localhost:3000/api/ttlock/user/login'
    return this.http.post<GetAccessTokenResponse>(url, body);
  }
  ResetPassword(nombre: string, clave: string): Observable<ResetPasswordResponse> {
    let body = { nombre, clave };
    let url = 'http://localhost:3000/api/ttlock/user/resetPassword'
    return this.http.post<ResetPasswordResponse>(url, body);
  }
  sendEmail_NewUser(recipientEmail: string, password: string) {//Template para passcode recurrente
    //esteban.vohk+6@gmail.com
    emailjs.send('contact_service', 'NewUser', {
      to_email: recipientEmail,
      subject: 'Bienvenido a la plataforma VOHK',
      username: recipientEmail,
      password: password,
    }, 'bdNkCTZsViZUFZCL9')
      .then((response) => { console.log('Email sent successfully:', response); })
      .catch((error) => { console.error('Error sending email:', error); });
  }
  createUserDB(accountName: string, originalUsername: string, nickname: string, email: string, phone: string, password: string) {
    let url = 'http://localhost:3000/api/usuarios/create';
    let newUser = {
      accountName,
      originalUsername,
      nickname,
      email,
      phone,
      password,
    };
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });
    let options = { headers };
    return this.http.post(url, newUser, options);
  }
  checkUserInDB(accountName:string): Observable<checkUserInDBResponse>{
    let url = `http://localhost:3000/api/usuarios/exists/${accountName}`;
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });
    let options = { headers };
    return this.http.get<checkUserInDBResponse>(url, options);
  }
  getUserDB(accountName: string): Observable<getUserInDBResponse>{
    let url = `http://localhost:3000/api/usuarios/${accountName}`;
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });
    let options = { headers };
    return this.http.get<getUserInDBResponse>(url, options);
  }
  changeNicknameDB(accountName: string, nickname: string) {
    let url = `http://localhost:3000/api/usuarios/nickname`;
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });
    let options = { headers };
    let body = {
      accountName,
      nickname
    }
    return this.http.put(url, body, options);
  }
  changePasswordDB(accountName: string, password: string) {
    let url = `http://localhost:3000/api/usuarios/password`;
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });
    let options = { headers };
    let body = {
      accountName,
      password
    }
    return this.http.put(url, body, options);
  }

}
