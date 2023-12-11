import { Component, OnInit } from '@angular/core';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { PopUpService } from '../../services/pop-up.service';
import { UserServiceService } from 'src/app/services/user-service.service';
import { getUserInDBResponse } from 'src/app/Interfaces/API_responses';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.css']
})
export class PerfilComponent implements OnInit {

  faEye = faEye;
  faEyeSlash = faEyeSlash;
  accountname: string;
  originalusername: string;
  nickname: string;
  email: string;
  phone: string;
  password: string;
  showPassword = false;
  dataLoaded = false;

  constructor(public popupService: PopUpService, private userService: UserServiceService) { }

  async ngOnInit() {
  }
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
  maskPassword(password: string) {
    return '*'.repeat(password.length);
  }
}
