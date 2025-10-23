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
    //console.log(data)
    this.isLoading = true;
    let response;
    if (this.validarInputs(data)) {
      let md5 = this.userService.getMD5(data.password)
      response = await lastValueFrom(this.userService.getAccessToken(data.username, md5)) as GetAccessTokenResponse;
      //console.log(response)
      if(response.userID) {
        sessionStorage.setItem('logged', '1')
        sessionStorage.setItem('user', data.username)
        this.isLoading = false;
        this.router.navigate(['']);
      } else if(response.description) {
        this.loginError = "Nombre de usuario y/o contraseña inválidos.\nSi está ingresando su numero de celular recuerde añadir '+56'";
        this.isLoading = false;
      } 
    }
  }
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
  maskPassword(password: string) {
    return '*'.repeat(password.length);
  }
  contacto(){
    
  }
}