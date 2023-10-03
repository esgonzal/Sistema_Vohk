import { Component } from '@angular/core';
import { UserServiceService } from '../../services/user-service.service';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { User } from '../../Interfaces/User';
import { lastValueFrom } from 'rxjs';
import { GetAccessTokenResponse } from '../../Interfaces/API_responses'

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  providers: []
})
export class LoginComponent {

  loginError: string = "";
  access_token: string;

  constructor(private router: Router, public userService: UserServiceService, private http: HttpClient) { }

  validarInputs(data: User) {
    if (data.username == '' && data.password == '') {
      this.loginError = 'Debe ingresar un nombre de usuario y contraseña '
      return false;
    } else {
      if (data.username == '') {
        this.loginError = 'Debe ingresar un nombre de usuario '
        return false;
      } else {
        if (data.password == '') {
          this.loginError = 'Debe ingresar una contraseña '
          return false;
        } else {
          return true;
        }
      }
    }
  }
  async login(data: User) {
    let response;
    if (this.validarInputs(data)) {
      response = await lastValueFrom(this.userService.getAccessToken(data.username, data.password)) as GetAccessTokenResponse;
      console.log(response)
      if (response.access_token) {
        this.access_token = response.access_token
        sessionStorage.setItem('logged', '1')
        sessionStorage.setItem('user', data.username)
        sessionStorage.setItem('token', this.access_token);
        sessionStorage.setItem('Account', 'TTLock')
        this.router.navigate(['/users/', data.username]);
      } else {
        let encode = this.userService.customBase64Encode(data.username);
        response = await lastValueFrom(this.userService.getAccessToken('bhaaa_'.concat(encode), data.password)) as GetAccessTokenResponse;
        console.log(response)
        if (response.access_token) {
          this.access_token = response.access_token
          sessionStorage.setItem('logged', '1')
          sessionStorage.setItem('user', data.username)
          sessionStorage.setItem('token', this.access_token);
          sessionStorage.setItem('Account', 'Vohk')
          this.router.navigate(['/users/', data.username]);
        } else {
          this.loginError = "Nombre de usuario y/o contraseña inválidos";
        }
      }
    }
  }
}



