import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { logoutResponse } from 'src/app/Interfaces/API_responses';
import { UserServiceService } from 'src/app/services/user-service.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {

  constructor(private router: Router, public userService: UserServiceService) { }

  returnNombre() {
    return sessionStorage.getItem('user') ?? '';
  }
  returnLogged() {
    return sessionStorage.getItem('logged') ?? '';
  }
  returnAccountType(){
    return sessionStorage.getItem('Account') ?? '';
  }
  mostrarCerraduras() {
    let username = sessionStorage.getItem('user') ?? '';
    this.router.navigate(['users', username]);
  }
  toPerfil() {
    let username = sessionStorage.getItem('user') ?? '';
    this.router.navigate(['users', username, 'perfil']);
  }
  async cerrarSesion() {
    let userID: string;
    if (this.returnAccountType() === 'TTLock'){
      userID = this.returnNombre();
    } else {
      userID = this.userService.encodeNombre(this.returnNombre());
    }
    await lastValueFrom(this.userService.logOut(userID)) as logoutResponse;
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('keyRight');
    sessionStorage.removeItem('userType');
    sessionStorage.removeItem('startDate');
    sessionStorage.removeItem('endDate');
    sessionStorage.removeItem('lockID');
    sessionStorage.removeItem('logged');
    sessionStorage.removeItem('Account');
    this.router.navigate(['home']);
  }
}

