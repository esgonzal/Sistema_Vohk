import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { operationResponse } from 'src/app/Interfaces/API_responses';
import { LockServiceService } from 'src/app/services/lock-service.service';
import { PopUpService } from 'src/app/services/pop-up.service';
import { UserServiceService } from 'src/app/services/user-service.service';
import { DarkModeService } from '../../services/dark-mode.service';
import { LockData } from 'src/app/Interfaces/Lock';

@Component({
  selector: 'app-transfer-lock',
  templateUrl: './transfer-lock.component.html',
  styleUrls: ['./transfer-lock.component.css']
})
export class TransferLockComponent {

  constructor(
    private userService: UserServiceService,
    public popupService: PopUpService,
    private lockService: LockServiceService,
    public DarkModeService: DarkModeService,
    private router: Router) { }

  locks: LockData[] = [];
  error: string = '';
  userID = sessionStorage.getItem('user') ?? ''
  lockId: number = Number(sessionStorage.getItem('lockID') ?? '')
  recieverUsername: string;
  isLoading: boolean;

  openLockSelector() {
    this.popupService.selectLocksForTransfer = true;
  }
  validarInputs() {
    if (this.recieverUsername === '' || this.recieverUsername === undefined) {
      this.error = 'Debe ingresar una cuenta de destinatario ';
      return false;
    } else if (!this.userService.isValidEmail(this.recieverUsername) && !this.userService.isValidPhone(this.recieverUsername).isValid) {
      this.error = 'La cuenta de destinatario debe ser un email o celular ';
      return false;
    } else if (!this.lockService.locksForTransfer || this.lockService.locksForTransfer.length === 0) {
      this.error = 'Debe seleccionar al menos una cerradura para transferir ';
      return false;
    } else {
      return true;
    }
  }
  async transferir() {
    this.isLoading = true;
    if (this.validarInputs()) {
      try {
        let lockIDList: string = "[".concat(this.lockService.locksForTransfer.map(lock => lock.id.toString()).join(", ")).concat("]");
        let response = await lastValueFrom(this.lockService.transferLock(this.userID, this.recieverUsername, lockIDList)) as operationResponse;
        console.log(response)
        if (response.errcode === 0) {
          this.popupService.transferLock = false;
          this.router.navigate(['']); 
        } else if (response.errcode === 10003) {
          sessionStorage.clear();
          window.location.reload();
        } else {
          console.log(response)
        }
      } catch (error) {
        console.error("Error while transfering a lock:", error);
      } finally {
        this.isLoading = false;
      }
    }
  }
}
