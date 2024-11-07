import { Component, ViewEncapsulation } from '@angular/core';
import { UserServiceService } from '../../services/user-service.service';
import { Router } from '@angular/router';
import { User } from '../../Interfaces/User';
import { lastValueFrom } from 'rxjs';
import { GatewayAccountResponse, GetAccessTokenResponse, LockListResponse } from '../../Interfaces/API_responses';
import { faUser, faKey, faEye, faEyeSlash, faHand } from '@fortawesome/free-solid-svg-icons';
import { DarkModeService } from '../../services/dark-mode.service';
import { LockServiceService } from 'src/app/services/lock-service.service';
import { GatewayService } from 'src/app/services/gateway.service';

@Component({
  selector: 'app-loginv2',
  templateUrl: './loginv2.component.html',
  styleUrls: ['./loginv2.component.css']
})
export class Loginv2Component {
  
  isLoading: boolean = false;
  loginError: string = "";
  faUser = faUser;
  faKey = faKey;
  faEye = faEye;
  faEyeSlash = faEyeSlash;
  faHand = faHand;
  showPassword = false;

  constructor(private router: Router, 
    public userService: UserServiceService, 
    public DarkModeService: DarkModeService, 
    private lockService: LockServiceService,
    private gatewayService: GatewayService,) { }

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
        //let lockResponse = await lastValueFrom(this.lockService.getLockListAccount(data.username)) as LockListResponse;
        //this.lockService.adminLocks = lockResponse.list;
        //let gatewayResponse = await lastValueFrom(this.gatewayService.getGatewaysAccount(data.username, 1, 100)) as GatewayAccountResponse;
        //this.gatewayService.gateways = gatewayResponse.list;
        //console.log(this.lockService.adminLocks)
        //console.log(this.gatewayService.gateways)
        sessionStorage.setItem('logged', '1')
        sessionStorage.setItem('user', data.username)
        this.isLoading = false;
        this.router.navigate(['']);
      } else if(response.description) {
        this.loginError = "Nombre de usuario y/o contraseña inválidos";
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