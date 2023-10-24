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

  nickname= '';
  dataLoaded = false;

  constructor(
    private router: Router,
    private userService: UserServiceService) { }

  returnNombre() {
    return sessionStorage.getItem('user') ?? '';
  }
  returnNickname() {
    return sessionStorage.getItem('nick') ?? '';
  }
  returnLogged() {
    return sessionStorage.getItem('logged') ?? '';
  }
  returnAccountType() {
    return sessionStorage.getItem('Account') ?? '';
  }
  mostrarCerraduras() {
    this.router.navigate(['users', this.returnNombre()]);
  }
  toPerfil() {
    this.router.navigate(['users', this.returnNombre(), 'perfil']);
  }
  async cerrarSesion() {
    let userID: string;
    if (this.returnAccountType() === 'TTLock') {
      userID = this.returnNombre();
    } else {
      userID = this.userService.encodeNombre(this.returnNombre());
    }
    await lastValueFrom(this.userService.logOut(userID)) as logoutResponse;
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }
}

