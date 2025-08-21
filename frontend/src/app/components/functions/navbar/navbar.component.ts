import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { logoutResponse } from 'src/app/Interfaces/API_responses';
import { UserServiceService } from 'src/app/services/user-service.service';
import { DarkModeService } from '../../../services/dark-mode.service';
import { PopUpService } from '../../../services/pop-up.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {

  nickname= '';
  dataLoaded = false;
  darkMode: boolean;
  isMobileView: boolean = window.innerWidth <= 600; 

  constructor(
    private router: Router,
    private userService: UserServiceService,
    private DarkModeService: DarkModeService,
    public popupService: PopUpService) { }
    
  ngOnInit(): void {
    this.darkMode = localStorage.getItem('darkMode') === 'true';  
  }

  @HostListener('window:resize', ['$event'])
    onResize(event: any) {
        this.isMobileView = event.target.innerWidth <= 600;
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
  TransferirLock() {
    this.popupService.transferLock = true;
  }
  TransferirHub() {
    this.popupService.transferHub = true;
  }
  async cerrarSesion() {
    let userID = this.returnNombre();
    await lastValueFrom(this.userService.logOut(userID)) as logoutResponse;
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }
}

