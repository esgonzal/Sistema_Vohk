import { Component } from '@angular/core';
import { UserServiceService } from '../../services/user-service.service';
import { Router } from '@angular/router';
import { User } from '../../Interfaces/User';
import { lastValueFrom } from 'rxjs';
import { GetAccessTokenResponse } from '../../Interfaces/API_responses';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { DarkModeService } from '../../services/dark-mode.service';

@Component({
  selector: 'app-loginv2',
  templateUrl: './loginv2.component.html',
  styleUrls: ['./loginv2.component.css']
})
export class Loginv2Component {

  isLoading: boolean = false;
  loginError: string = "";
  faEye = faEye;
  faEyeSlash = faEyeSlash;
  showPassword = false;

  constructor(private router: Router,
    public userService: UserServiceService,
    public DarkModeService: DarkModeService) { }


  async login(data: User) {
    this.loginError = '';
    this.isLoading = true;
    if (!this.validarInputs(data)) {
      this.isLoading = false;
      return;
    }
    try {
      const md5 = this.userService.getMD5(data.password);
      const response = await lastValueFrom(this.userService.getAccessToken(data.username, md5)) as GetAccessTokenResponse;
      console.log(response)
      if (response.access_token) {
        sessionStorage.setItem('logged', '1');
        sessionStorage.setItem('user', data.username);
        sessionStorage.setItem('accessToken', response.access_token);
        if (response.refresh_token) {
          sessionStorage.setItem('refreshToken', response.refresh_token);
        }
        this.isLoading = false;
        this.router.navigate(['']);
      } else if (response.errcode === 10007) {
        this.loginError = "Nombre de usuario y/o contraseña inválidos.\nSi está ingresando su numero de celular recuerde añadir '+56'";
      }
    } catch (error: any) {
      if (error.status === 401) {
        this.loginError = "Nombre de usuario y/o contraseña inválidos.\nSi está ingresando su numero de celular recuerde añadir '+56'";
      } else {
        this.loginError = "Ocurrió un error al conectar con el servidor.";
      }
      this.isLoading = false;
    } finally {
      this.isLoading = false;
    }
  }
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
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
  maskPassword(password: string) {
    return '*'.repeat(password.length);
  }
  contacto() {

  }
}