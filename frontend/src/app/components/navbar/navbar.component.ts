import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { logoutResponse } from 'src/app/Interfaces/API_responses';
import { UserServiceService } from 'src/app/services/user-service.service';
import { DarkModeService } from '../../services/dark-mode.service';
import { faHome } from '@fortawesome/free-solid-svg-icons'

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {

  nickname= '';
  dataLoaded = false;
  darkMode: boolean;
  faHome = faHome;

  constructor(
    private router: Router,
    private userService: UserServiceService,
    private DarkModeService: DarkModeService) { }
    
  ngOnInit(): void {
    this.darkMode = localStorage.getItem('darkMode') === 'true';  
  }

  updateDarkMode() {
    localStorage.setItem('darkMode', this.darkMode.toString());
    this.DarkModeService.setDarkMode(this.darkMode)
  }

  returnNombre() {
    return sessionStorage.getItem('user') ?? '';
  }
  returnLogged() {
    return sessionStorage.getItem('logged') ?? '';
  }
  mostrarCerraduras() {
    this.router.navigate(['']);
  }
  toPerfil() {
    this.router.navigate(['users', this.returnNombre(), 'perfil']);
  }
  async cerrarSesion() {
    let userID = this.returnNombre();
    await lastValueFrom(this.userService.logOut(userID)) as logoutResponse;
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }
}

