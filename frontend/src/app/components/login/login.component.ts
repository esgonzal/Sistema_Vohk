import { Component } from '@angular/core';
import { UserServiceService } from '../../services/user-service.service';
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

  constructor(private router: Router, public userService: UserServiceService) { }

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
      if (response.errcode === 'Success') {
        sessionStorage.setItem('logged', '1')
        sessionStorage.setItem('user', data.username)
        sessionStorage.setItem('Account', 'TTLock')
        this.router.navigate(['/users/', data.username]);
      } else {
        let encode = this.userService.encodeNombre(data.username);
        response = await lastValueFrom(this.userService.getAccessToken(encode, data.password)) as GetAccessTokenResponse;
        if (response.errcode === 'Success') {
          sessionStorage.setItem('logged', '1')
          sessionStorage.setItem('user', data.username)
          sessionStorage.setItem('Account', 'Vohk')
          this.router.navigate(['/users/', data.username]);
        } else {
          this.loginError = "Nombre de usuario y/o contraseña inválidos";
        }
      }
    }
  }
}



