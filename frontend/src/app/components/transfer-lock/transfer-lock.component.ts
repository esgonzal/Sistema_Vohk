import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { operationResponse } from 'src/app/Interfaces/API_responses';
import { EkeyServiceService } from 'src/app/services/ekey-service.service';
import { LockServiceService } from 'src/app/services/lock-service.service';
import { PopUpService } from 'src/app/services/pop-up.service';
import { UserServiceService } from 'src/app/services/user-service.service';
import { faHome, faLock, faRightLeft } from '@fortawesome/free-solid-svg-icons'
import { DarkModeService } from '../../services/dark-mode.service';

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
    public DarkModeService: DarkModeService,
    private router: Router) { }

  faHome = faHome;
  faLock = faLock;
  faRightLeft = faRightLeft
  error: string = '';
  username = sessionStorage.getItem('user') ?? ''
  lockId: number = Number(sessionStorage.getItem('lockID') ?? '')
  recieverUsername: string;
  isLoading: boolean;

  async transferir() {
    this.isLoading = true;
    try {
      let lockID = sessionStorage.getItem('lockID') ?? ''
      let lockIDList: string = "[".concat(lockID).concat("]");
      let response = await lastValueFrom(this.lockService.transferLock(this.lockService.userID, this.recieverUsername, lockIDList)) as operationResponse;
      if (response.errcode === 0) {
        this.router.navigate(["users", sessionStorage.getItem('user') ?? '']);
        console.log("La cerradura se transfirió a la cuenta exitosamente")
      } else if (response.errcode === 10003) {
        sessionStorage.clear();
      } else {
        console.log(response)
      }
    } catch (error) {
      console.error("Error while transfering a lock:", error);
    } finally {
      this.isLoading = false;
      this.popupService.transferLock = false;
      window.location.reload();
    }
  }
}
