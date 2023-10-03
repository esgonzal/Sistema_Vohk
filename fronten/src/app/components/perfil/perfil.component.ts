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
    const accountName = 'bhaaa_'.concat(this.userService.customBase64Encode(sessionStorage.getItem('user') || ''));
    if (accountName) {
      const response = await lastValueFrom(this.userService.getUserDB(accountName)) as getUserInDBResponse;
      if (response) {
        this.accountname = response.accountname || '';
        this.originalusername = response.originalusername || '';
        this.nickname = response.nickname || '';
        this.email = response.email || '';
        this.phone = response.phone || '';
        this.password = response.password || '';
        this.dataLoaded = true;
      }
    }
  }
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
  maskPassword(password: string) {
    return '*'.repeat(password.length);
  }
  resetPassword() {
    if (this.getAccountType() === 'Vohk') {
      this.popupService.accountName = this.accountname;
      this.popupService.password = this.password;
      this.popupService.resetPassword = true;
    } else {
      this.popupService.wrongAccountType = true;
    }
  }
  getAccountType() {
    return sessionStorage.getItem('Account');
  }
  cambiarNickname() {
    this.popupService.accountName = this.accountname;
    this.popupService.changeNickname = true;
  }
}
