import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { operationResponse } from 'src/app/Interfaces/API_responses';
import { EkeyServiceService } from 'src/app/services/ekey-service.service';
import { LockServiceService } from 'src/app/services/lock-service.service';
import { PopUpService } from 'src/app/services/pop-up.service';
import { UserServiceService } from 'src/app/services/user-service.service';

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
    private ekeyService: EkeyServiceService, 
    private router: Router) { }

  error: string = '';
  username = sessionStorage.getItem('user') ?? ''
  lockId: number = Number(sessionStorage.getItem('lockID') ?? '')
  recieverUsername: string;
  isLoading: boolean;

  async transferir() {
    // 1 - Primero se intenta asumiendo que la cuenta receptora es TTLock. Si funciona, todo perfecto
    // 2 - Si no funciona, se intenta asumiendo que la cuenta receptora es VOHK. Si no funciona quiere decir que la cuenta no existe.
    this.isLoading = true;
    try {
      let lockID = sessionStorage.getItem('lockID') ?? ''
      let lockIDList: string = "[".concat(lockID).concat("]");
      let response = await lastValueFrom(this.lockService.transferLock(this.lockService.token, this.recieverUsername, lockIDList)) as operationResponse;
      if (response.errcode === 0) {//Es cuenta TTLock
        this.router.navigate(["users", sessionStorage.getItem('user') ?? '']);
        console.log("La cerradura se transfirió a la cuenta TTLock exitosamente")
        
        lastValueFrom(this.ekeyService.changeIsUser(this.recieverUsername, Number(lockID), false))
      } else if (response.errcode === -1002) {
        let encode = this.userService.customBase64Encode(this.recieverUsername);
        response = await lastValueFrom(this.lockService.transferLock(this.lockService.token, 'bhaaa_'.concat(encode), lockIDList)) as operationResponse;
        if (response.errcode == 0) {//Es cuenta VOHK
          this.router.navigate(["users", sessionStorage.getItem('user') ?? '']);
          console.log("La cerradura se transfirió a la cuenta VOHK exitosamente")
          lastValueFrom(this.ekeyService.changeIsUser('bhaaa_'.concat(encode), Number(lockID), false))
        } else if (response.errcode === -1002) {
          this.error = 'El receptor ingresado no tiene una cuenta registrada.'
        } else {
          console.log(response)
        }
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
