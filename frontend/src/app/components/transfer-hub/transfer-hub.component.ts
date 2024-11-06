import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { operationResponse } from 'src/app/Interfaces/API_responses';
import { PopUpService } from 'src/app/services/pop-up.service';
import { UserServiceService } from 'src/app/services/user-service.service';
import { DarkModeService } from '../../services/dark-mode.service';
import { LockData } from 'src/app/Interfaces/Lock';
import { GatewayService } from '../../services/gateway.service';

@Component({
  selector: 'app-transfer-hub',
  templateUrl: './transfer-hub.component.html',
  styleUrls: ['./transfer-hub.component.css']
})
export class TransferHubComponent {

  constructor(
    private userService: UserServiceService,
    public popupService: PopUpService,
    public DarkModeService: DarkModeService,
    private gatewayService: GatewayService,
    private router: Router) { }

    locks: LockData[] = [];
    error: string = '';
    userID = sessionStorage.getItem('user') ?? ''
    lockId: number = Number(sessionStorage.getItem('lockID') ?? '')
    recieverUsername: string;
    isLoading: boolean;

    openHubSelector() {
      this.popupService.selectHubsForTransfer = true;
    }

    validarInputs() {
      if (this.recieverUsername === '' || this.recieverUsername === undefined) {
        this.error = 'Debe ingresar una cuenta de destinatario ';
        return false;
      } else if (!this.userService.isValidEmail(this.recieverUsername) && !this.userService.isValidPhone(this.recieverUsername).isValid) {
        this.error = 'La cuenta de destinatario debe ser un email o celular ';
        return false;
      } else if (!this.gatewayService.selectedHubs || this.gatewayService.selectedHubs.length === 0) {
        this.error = 'Debe seleccionar al menos un gateway para transferir ';
        return false;
      } else {
        return true;
      }
    }

    async transferir() {
      this.isLoading = true;
      if (this.validarInputs()) {
        try {
          let gatewayIdList: string = "[".concat(this.gatewayService.selectedHubs.map(hub => hub.id.toString()).join(", ")).concat("]");
          let response = await lastValueFrom(this.gatewayService.transferGateway(this.userID, this.recieverUsername, gatewayIdList)) as operationResponse;
          console.log(response)
          if (response.errcode === 0) {
            this.popupService.transferHub = false;
            this.router.navigate(['']); 
            window.location.reload();
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
