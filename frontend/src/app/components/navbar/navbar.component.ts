import { Component } from '@angular/core';
import { Router } from '@angular/router';
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
  cerrarSesion() {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
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

