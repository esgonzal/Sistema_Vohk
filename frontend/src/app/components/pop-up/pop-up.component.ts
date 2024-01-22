import { ChangeDetectorRef, Component, OnInit, SecurityContext } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { PopUpService } from '../../services/pop-up.service';
import { PasscodeServiceService } from '../../services/passcode-service.service';
import { EkeyServiceService } from '../../services/ekey-service.service';
import { CardServiceService } from '../../services/card-service.service';
import { FingerprintServiceService } from '../../services/fingerprint-service.service';
import { UserServiceService } from '../../services/user-service.service';
import { LockServiceService } from '../../services/lock-service.service';
import { GroupService } from '../../services/group.service';
import { GatewayService } from 'src/app/services/gateway.service';

import { GatewayAccount } from '../../Interfaces/Gateway';
import { Formulario } from '../../Interfaces/Formulario';
import { operationResponse, addGroupResponse, GetLockTimeResponse } from '../../Interfaces/API_responses';

import { lastValueFrom } from 'rxjs';
import moment from 'moment';
import { Clipboard } from '@angular/cdk/clipboard';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';


@Component({
  selector: 'app-pop-up',
  templateUrl: './pop-up.component.html',
  styleUrls: ['./pop-up.component.css']
})
export class PopUpComponent implements OnInit {
  isLoading: boolean = false;
  gatewayEncontrado: GatewayAccount | undefined
  redWiFi: string | undefined;
  displayedColumnsGateway: string[] = ['NombreGateway', 'NombreWifi', 'Signal']
  autoLockToggle = false;
  customAutoLockTime: number = 0;
  selectedType = '';
  error = '';
  selectedLockIds: number[] = [];
  currentPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  URL = 'https://api.vohkapp.com';
  cardNumber: string = '';
  trustedHtml: SafeHtml;
  public isCopied: boolean = false;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private lockService: LockServiceService,
    private passcodeService: PasscodeServiceService,
    private cardService: CardServiceService,
    private fingerprintService: FingerprintServiceService,
    private gatewayService: GatewayService,
    private groupService: GroupService,
    public dialogRef: MatDialog,
    public userService: UserServiceService,
    public ekeyService: EkeyServiceService,
    public popupService: PopUpService,
    private clipboard: Clipboard,
    private sanitizer: DomSanitizer,
  ) { }

  ngOnInit(): void {
    // Esto es para mostrar los valores actuales del AutoLockTime si es que estaba activado desde antes
    if (this.popupService.detalles) {
      if (this.popupService.detalles.autoLockTime >= 0) {
        this.autoLockToggle = true;
        switch (this.popupService.detalles.autoLockTime) {
          case 5:
            this.selectedType = '1';
            break;
          case 10:
            this.selectedType = '2';
            break;
          case 15:
            this.selectedType = '3';
            break;
          case 30:
            this.selectedType = '4';
            break;
          case 60:
            this.selectedType = '5';
            break;
          default:
            this.selectedType = '6';
            this.customAutoLockTime = this.popupService.detalles.autoLockTime;
        }
      }
    }
    if (this.popupService.cardReader) {
      document.addEventListener('keydown', (event) => {
        this.cardNumber += event.key;
        if (event.key === 'Enter') {
          const trimmedCardNumber = this.cardNumber.replace(/\D/g, '');
          if (trimmedCardNumber !== '') {
            //console.log('Card Number:', trimmedCardNumber);
            this.popupService.cardReader = false;
            this.cardService.cardNumber = trimmedCardNumber;
            this.cardNumber = '';
          }
        }
      });
    }
  }
  navigateToLogin() {
    this.popupService.registro = false;
    this.router.navigate(['/login']);
  }
  async delete() {
    let response;
    this.isLoading = true;
    try {
      if (this.popupService.delete) {
        switch (this.popupService.elementType) {
          case 'passcode':
            response = await lastValueFrom(this.passcodeService.deletePasscode(this.popupService.userID, this.popupService.lockID, this.popupService.elementID)) as operationResponse;
            break;
          case 'ekey':
            response = await lastValueFrom(this.ekeyService.deleteEkey(this.popupService.userID, this.popupService.elementID, this.popupService.lockID, this.popupService.ekeyUsername)) as operationResponse;
            break;
          case 'card':
            response = await lastValueFrom(this.cardService.deleteCard(this.popupService.userID, this.popupService.lockID, this.popupService.elementID)) as operationResponse;
            break;
          case 'fingerprint':
            response = await lastValueFrom(this.fingerprintService.deleteFingerprint(this.popupService.userID, this.popupService.lockID, this.popupService.elementID)) as operationResponse;
            break;
          case 'grupo':
            response = await lastValueFrom(this.groupService.deleteGroup(this.popupService.userID, this.popupService.elementID.toString())) as operationResponse;
            break;
          default:
            console.error('Invalid element type for deletion:', this.popupService.elementID);
            break;
        }
      }
      //console.log(response)
      if (response?.errcode === 0) {
        this.popupService.delete = false;
        console.log(this.popupService.elementType, "borrada exitosamente")
        window.location.reload();
      } else if (response?.errcode === 10003) {
        sessionStorage.clear();
        this.popupService.delete = false;
        this.router.navigate(['/login']);
      } else {
        this.error = "La acción eliminar no pudo ser completada, intente nuevamente mas tarde."
      }
    } catch (error) {
      console.error("Error while deleting:", error);
    } finally {
      this.isLoading = false;
    }
  }
  async autorizar() {
    let response = await lastValueFrom(this.ekeyService.AuthorizeEkey(this.popupService.userID, this.popupService.lockID, this.popupService.elementID)) as operationResponse;
    console.log(response)
    this.popupService.autorizar = false;
    window.location.reload();
  }
  async desautorizar() {
    let response = await lastValueFrom(this.ekeyService.cancelAuthorizeEkey(this.popupService.userID, this.popupService.lockID, this.popupService.elementID)) as operationResponse;
    console.log(response)
    this.popupService.desautorizar = false;
    window.location.reload();
  }
  async congelar() {
    this.isLoading = true;
    try {
      let response = await lastValueFrom(this.ekeyService.freezeEkey(this.popupService.userID, this.popupService.elementID)) as operationResponse;
      console.log(response)
      if (response.errcode === 0) {
        this.popupService.congelar = false;
        console.log("eKey congelada exitosamente")
        window.location.reload();
      } else if (response?.errcode === 10003) {
        sessionStorage.clear();
        this.popupService.congelar = false;
        this.router.navigate(['/login']);
      } else {
        this.error = "La acción congelar no pudo ser completada, intente nuevamente mas tarde."
      }
    } catch (error) {
      console.error("Error while freezing:", error);
    } finally {
      this.isLoading = false;
    }
  }
  async descongelar() {
    this.isLoading = true;
    try {
      let response = await lastValueFrom(this.ekeyService.unfreezeEkey(this.popupService.userID, this.popupService.elementID));
      //console.log(response)
      if (response.errcode === 0) {
        this.popupService.descongelar = false;
        window.location.reload();
        console.log("eKey descongelada exitosamente")
      } else if (response?.errcode === 10003) {
        sessionStorage.clear();
        this.popupService.descongelar = false;
        this.router.navigate(['/login']);
      } else {
        this.error = "La acción descongelar no pudo ser completada, intente nuevamente mas tarde."
      }
    } catch (error) {
      console.error("Error while unfreezing:", error);
    } finally {
      this.isLoading = false;
    }
  }
  transformarRemoteEnable(Slider: boolean) {
    if (Slider) {
      return '1'
    } else {
      return '2'
    }
  }
  async cambiarNombre(datos: Formulario) {
    this.error = '';
    let response;
    this.isLoading = true;
    try {
      if (!datos.name) {
        this.error = "Por favor ingrese un nombre"
      } else {
        if (this.popupService.cambiarNombre) {
          switch (this.popupService.elementType) {
            case 'ekey':
              response = await lastValueFrom(this.ekeyService.modifyEkey(this.popupService.userID, this.popupService.elementID, datos.name)) as operationResponse;
              break;
            case 'card':
              response = await lastValueFrom(this.cardService.changeName(this.popupService.userID, this.popupService.lockID, this.popupService.elementID, datos.name)) as operationResponse;
              break;
            case 'fingerprint':
              response = await lastValueFrom(this.fingerprintService.changeName(this.popupService.userID, this.popupService.lockID, this.popupService.elementID, datos.name)) as operationResponse;
              break;
            case 'grupo':
              response = await lastValueFrom(this.groupService.renameGroup(this.popupService.userID, this.popupService.elementID.toString(), datos.name)) as operationResponse;
              break;
            default:
              console.error('Invalid element type for deletion:', this.popupService.elementID);
              break;
          }
        }
        //console.log(response)
        if (response?.errcode === 0) {
          this.popupService.cambiarNombre = false;
          window.location.reload();
          console.log("Se ha cambiado el nombre de", this.popupService.elementType, "exitosamente")
        } else if (response?.errcode === -3) {
          this.error = "El nombre ingresado es muy largo"
        } else if (response?.errcode === 10003) {
          sessionStorage.clear();
          this.popupService.cambiarNombre = false;
          this.router.navigate(['/login']);
        } else {
          this.error = "La acción cambiar nombre no pudo ser completada, intente nuevamente mas tarde."
        }
      }
    } catch (error) {
      console.error("Error while changing name:", error);
    } finally {
      this.isLoading = false;
    }
  }
  async cambiarPeriodo(datos: Formulario) {
    this.error = '';
    let response;
    this.isLoading = true;
    try {
      if (!datos.startDate || !datos.startHour || !datos.endDate || !datos.endHour) {
        this.error = "Por favor ingrese los datos requeridos"
      } else {
        let newStartDay = moment(datos.startDate).valueOf()
        let newEndDay = moment(datos.endDate).valueOf()
        let newStartDate = moment(newStartDay).add(this.lockService.transformarHora(datos.startHour), "milliseconds").valueOf()
        let newEndDate = moment(newEndDay).add(this.lockService.transformarHora(datos.endHour), "milliseconds").valueOf()
        if (moment(newEndDate).isAfter(moment(newStartDate))) {
          switch (this.popupService.elementType) {
            case 'ekey':
              response = await lastValueFrom(this.ekeyService.changePeriod(this.popupService.userID, this.popupService.elementID, newStartDate.toString(), newEndDate.toString())) as operationResponse;
              break;
            case 'card':
              response = await lastValueFrom(this.cardService.changePeriod(this.popupService.userID, this.popupService.lockID, this.popupService.elementID, newStartDate.toString(), newEndDate.toString())) as operationResponse;
              break;
            case 'fingerprint':
              response = await lastValueFrom(this.fingerprintService.changePeriod(this.popupService.userID, this.popupService.lockID, this.popupService.elementID, newStartDate.toString(), newEndDate.toString())) as operationResponse;
              break;
            default:
              console.error('Invalid element type for deletion:', this.popupService.elementID);
              break;
          }
          //console.log(response)
          if (response?.errcode === 0) {
            this.popupService.cambiarPeriodo = false;
            window.location.reload();
          } else if (response?.errcode === 10003) {
            sessionStorage.clear();
            this.popupService.cambiarPeriodo = false;
            this.router.navigate(['/login']);
          } else {
            this.error = "La acción cambiar periodo no pudo ser completada, intente nuevamente mas tarde"
          }
        } else {
          this.error = 'La fecha de término no puede ser antes que la fecha de inicio';
        }
      }
    } catch (error) {
      console.error("Error while changing period:", error);
    } finally {
      this.isLoading = false;
    }
  }
  async editarPasscode(datos: Formulario) {
    let response;
    let newStartDate;
    let newEndDate;
    this.error = '';
    this.isLoading = true;
    try {
      if (this.popupService.passcode.keyboardPwdType === 1 || this.popupService.passcode.keyboardPwdType === 2 || this.popupService.passcode.keyboardPwdType === 4) {
        response = await lastValueFrom(this.passcodeService.changePasscode(this.popupService.userID, this.popupService.lockID, this.popupService.elementID, datos.name, datos.passcodePwd)) as operationResponse;
      }
      if (this.popupService.passcode.keyboardPwdType === 3) {
        let newStartDay = moment(datos.startDate).valueOf()
        let newEndDay = moment(datos.endDate).valueOf()
        newStartDate = moment(newStartDay).add(this.lockService.transformarHora(datos.startHour), "milliseconds").valueOf()
        newEndDate = moment(newEndDay).add(this.lockService.transformarHora(datos.endHour), "milliseconds").valueOf()
        response = await lastValueFrom(this.passcodeService.changePasscode(this.popupService.userID, this.popupService.lockID, this.popupService.elementID, datos.name, datos.passcodePwd, newStartDate.toString(), newEndDate.toString())) as operationResponse
      }
      if (this.popupService.passcode.keyboardPwdType === 5 || this.popupService.passcode.keyboardPwdType === 6 || this.popupService.passcode.keyboardPwdType === 7 || this.popupService.passcode.keyboardPwdType === 8 || this.popupService.passcode.keyboardPwdType === 9 || this.popupService.passcode.keyboardPwdType === 10 || this.popupService.passcode.keyboardPwdType === 11 || this.popupService.passcode.keyboardPwdType === 12 || this.popupService.passcode.keyboardPwdType === 13 || this.popupService.passcode.keyboardPwdType === 14) {
        let today = moment({ hour: 0, minute: 0 }).valueOf()
        let newStartDate = moment(today).add(this.lockService.transformarHora(datos.startHour), "milliseconds").valueOf()
        let newEndDate = moment(today).add(this.lockService.transformarHora(datos.endHour), "milliseconds").valueOf()
        response = await lastValueFrom(this.passcodeService.changePasscode(this.popupService.userID, this.popupService.lockID, this.popupService.elementID, datos.name, datos.passcodePwd, newStartDate.toString(), newEndDate.toString()))
      }
      //console.log(response)
      if (response?.errcode === 0) {
        this.popupService.editarPasscode = false;
        window.location.reload();
        console.log("passcode editada correctamente");
      } else if (response?.errcode === -3008) {
        this.error = "No se puede editar una passcode que no haya sido usada antes";
      } else if (response?.errcode === -3007) {
        this.error = "Por favor ingresa un código diferente";
      } else if (response?.errcode === -3006) {
        this.error = "El código debe tener entre 4 y 9 digitos";//TTLock dice entre 6-9
      } else if (response?.errcode === 10003) {
        sessionStorage.clear();
        this.popupService.editarPasscode = false;
        this.router.navigate(['/login']);
      }
    } catch (error) {
      console.error("Error while editing a passcode:", error);
    } finally {
      this.isLoading = false;
    }
  }
  encontrarRed(gatewayID: number) {
    this.gatewayEncontrado = this.popupService.gatewaysOfAccount.find((gw: { gatewayId: number }) => gw.gatewayId === gatewayID)
    this.redWiFi = this.gatewayEncontrado?.networkName;
    return this.redWiFi;
  }
  displayrssi(rssi: number) {
    if (rssi > -75) {
      return 'Fuerte '.concat(rssi.toString());
    }
    if (rssi < -85) {
      return 'Debil '.concat(rssi.toString());
    }
    else {
      return 'Mediana '.concat(rssi.toString());
    }
  }
  onSelected(value: string): void {
    this.selectedType = value;
    if (this.selectedType !== '6') { this.customAutoLockTime = 0; }
  }
  autoLockToggleChange(event: any) {
    this.autoLockToggle = event.checked;
    this.selectedType = this.autoLockToggle ? '1' : '6';
    if (!this.autoLockToggle) { this.customAutoLockTime = 0; }
    this.cdr.detectChanges()
  }
  transformarAsegundos(value: string) {
    switch (value) {
      case "1":
        return 5;
      case "2":
        return 10;
      case "3":
        return 15;
      case "4":
        return 30;
      case "5":
        return 60;
      default:
        return this.customAutoLockTime;
    }
  }
  async cambiarAutoLock() {
    let segundos: number = -1;
    if (this.autoLockToggle) {
      segundos = this.transformarAsegundos(this.selectedType)
    }
    this.isLoading = true;
    try {
      let response = await lastValueFrom(this.lockService.setAutoLock(this.popupService.userID, this.popupService.lockID, segundos)) as operationResponse;
      if (response.errcode === 0) {
        this.popupService.cerradoAutomatico = false;
        window.location.reload();
      } else if (response.errcode === 10003) {
        sessionStorage.clear();
        this.popupService.cerradoAutomatico = false;
        this.router.navigate(['/login']);
      } else {
        this.error = "No se pudo completar la acción, intente nuevamente más tarde"
        console.log(response);
      }
    } catch (error) {
      console.error("Error while setting auto lock:", error);
    } finally {
      this.isLoading = false;
    }
  }
  formatearHora() {
    return moment(this.popupService.currentTime).format("DD/MM/YYYY HH:mm:ss")
  }
  async crearGrupo(datos: Formulario) {
    this.error = '';
    this.isLoading = true;
    try {
      if (!datos.name) {
        this.error = "Por favor ingrese el dato requerido"
      } else {
        let response = await lastValueFrom(this.groupService.addGroup(this.popupService.userID, datos.name)) as addGroupResponse;
        //console.log(response)
        if (response.groupID) {
          this.popupService.newGroup = false;
          window.location.reload();
        } else if (response.errcode === -3) {
          this.error = "El nombre ingresado es muy largo";
        } else if (response.errcode === -1016) {
          this.error = "Ya existe un grupo con ese mismo nombre, elija otro nombre";
        } else if (response.errcode === 10003) {
          sessionStorage.clear();
          this.popupService.newGroup = false;
          this.router.navigate(['/login']);
        } else {
          this.error = "No se pudo completar la acción, intente nuevamente más tarde";
        }
      }
    } catch (error) {
      console.error("Error while creating a group:", error);
    } finally {
      this.isLoading = false;
    }
  }
  openAddLockGroup() {
    this.popupService.addLockGROUP = true;
    this.popupService.addRemoveLockGROUP = false;
  }
  openRemoveLockGroup() {
    this.popupService.removeLockGROUP = true;
    this.popupService.addRemoveLockGROUP = false;
  }
  toggleLockSelection(lockId: number) {
    const index = this.selectedLockIds.indexOf(lockId);
    if (index !== -1) {
      // If lock ID is already in the array, remove it
      this.selectedLockIds.splice(index, 1);
    } else {
      // If lock ID is not in the array, add it
      this.selectedLockIds.push(lockId);
    }
    //console.log("selectedLockIds: ", this.selectedLockIds)
  }
  async removeSelectedLocksFromGroup() {
    this.isLoading = true;
    try {
      if (this.selectedLockIds.length === 0) {
        console.log("Seleccione al menos una cerradura para remover");
      } else {
        for (const lockId of this.selectedLockIds) {
          let response = await lastValueFrom(this.groupService.setGroupofLock(this.popupService.userID, lockId.toString(), "0")) as operationResponse;
          if (response.errcode === 0) {
            console.log("Se removió la cerradura exitosamente")
          } else if (response?.errcode === 10003) {
            sessionStorage.clear();
            this.popupService.removeLockGROUP = false;
            this.router.navigate(['/login']);
          } else {
            console.log(response)
          }
        }
        this.popupService.removeLockGROUP = false;
        window.location.reload();
      }
    } catch (error) {
      console.error("Error while removing locks from a group:", error);
    } finally {
      this.isLoading = false;
    }
  }
  async addSelectedLocksToGroup() {
    this.isLoading = true;
    try {
      if (this.selectedLockIds.length === 0) {
        console.log("Seleccione al menos una cerradura para añadir");
      } else {
        for (const lockId of this.selectedLockIds) {
          let response = await lastValueFrom(this.groupService.setGroupofLock(this.popupService.userID, lockId.toString(), this.popupService.group.groupId.toString())) as operationResponse;
          if (response.errcode === 0) {
            console.log("Se removió la cerradura exitosamente")
          } else if (response.errcode === 10003) {
            sessionStorage.clear();
            this.popupService.addLockGROUP = false;
            this.router.navigate(['/login']);
          } else {
            console.log(response)
          }
        }
        this.popupService.addLockGROUP = false;
        window.location.reload();
      }
    } catch (error) {
      console.error("Error while adding locks from a group:", error);
    } finally {
      this.isLoading = false;
    }
  }
  isLockSelected(lockId: number): boolean {
    return this.ekeyService.selectedLocks.includes(lockId);
  }
  selectLocks() {
    this.ekeyService.selectedLocks = this.popupService.selectedLockIds_forMultipleEkeys
    this.popupService.selectLocksForMultipleEkeys = false;
  }
  addRecipientPair() {
    this.popupService.recipients.push({ username: '', ekeyName: '' });
  }
  removeRecipientPair(index: number) {
    this.popupService.recipients.splice(index, 1);
  }
  confirmRecipients() {
    //console.log(this.popupService.recipients)
    if (!this.error) {
      this.ekeyService.recipients = this.popupService.recipients;
      this.popupService.addRecipientsForMultipleEkeys = false;
    }
  }
  validateEmailPhone(username: string) {
    if (!this.userService.isValidEmail(username) && !this.userService.isValidPhone(username).isValid) {
      this.error = 'El destinatario debe ser un email o un numero de teléfono';
      return false;
    } else {
      this.error = '';
      return true;
    }
  }
  async compartirCodigo(datos: Formulario) {
    this.error = '';
    this.isLoading = true;
    try {
      if (this.userService.isValidEmail(datos.name)) {
        if (this.popupService.passcode.keyboardPwdType === 1) {//De un uso
          await lastValueFrom(this.passcodeService.sendEmail_passcodeOneTime(datos.name, this.popupService.userID, this.popupService.lock_alias, this.popupService.passcode.keyboardPwd));
        }
        else if (this.popupService.passcode.keyboardPwdType === 2) {//Permanente
          await lastValueFrom(this.passcodeService.sendEmail_passcodePermanent(datos.name, this.popupService.userID, this.popupService.lock_alias, this.popupService.passcode.keyboardPwd));
        }
        else if (this.popupService.passcode.keyboardPwdType === 3) {//Periodica
          await lastValueFrom(this.passcodeService.sendEmail_passcodePeriodic(datos.name, this.popupService.userID, this.popupService.lock_alias, this.popupService.passcode.keyboardPwd, moment(this.popupService.passcode.startDate).format("DD/MM/YYYY HH:mm"), moment(this.popupService.passcode.endDate).format("DD/MM/YYYY HH:mm")));
        }
        else if (this.popupService.passcode.keyboardPwdType === 4) {//Borrar
          await lastValueFrom(this.passcodeService.sendEmail_passcodeDelete(datos.name, this.popupService.userID, this.popupService.lock_alias, this.popupService.passcode.keyboardPwd));
        }
        else {//Recurrente
          await lastValueFrom(this.passcodeService.sendEmail_passcodeDays(datos.name, this.popupService.userID, this.popupService.lock_alias, this.popupService.passcode.keyboardPwd, moment(this.popupService.passcode.startDate).format("HH:mm"), moment(this.popupService.passcode.endDate).format("HH:mm"), this.popupService.passcode.keyboardPwdType));
        }
        this.popupService.sharePasscode = false;
      } else {
        this.error = "Ingrese un correo electrónico válido."
      }
    } catch (error) {
      console.error("Error while sending email to share a passcode:", error);
    } finally {
      this.isLoading = false;
    }
  }
  async ajustarHora() {
    this.isLoading = true;
    try {
      let response = await lastValueFrom(this.gatewayService.adjustLockTime(this.gatewayService.userID, this.gatewayService.lockID)) as GetLockTimeResponse
      if (response.date) {
        console.log("Hora ajustada")
      } else if (response?.errcode === 10003) {
        sessionStorage.clear();
        this.popupService.congelar = false;
        this.router.navigate(['/login']);
      } else {
        console.log(response)
      }
    } catch (error) {
      console.error("Error while adjusting the time of a lock:", error);
    } finally {
      this.isLoading = false;
    }
  }
  getCardNumber(datos: Formulario) {
    console.log(datos.name)
  }
  closeEmailPopup() {
    this.popupService.emailSuccess = false
    this.router.navigate(["users", this.ekeyService.username, "lock", this.ekeyService.lockID]);
  }
  copyToClipboard() {
    const emailContent = this.popupService.emailMessage;
    if (emailContent) {
      const sanitizedContent = this.sanitizer.sanitize(SecurityContext.HTML, emailContent) || '';
      const tempElement = document.createElement('div');
      tempElement.innerHTML = sanitizedContent;
      const textContent = tempElement.textContent || tempElement.innerText;
      const clipboardAttempt = this.clipboard.beginCopy(textContent);
      let remainingAttempts = 5;
      const attempt = () => {
        const result = clipboardAttempt.copy();
        if (result) {
          this.isCopied = true;
          setTimeout(() => {
            this.isCopied = false;
          }, 2000);
        } else if (--remainingAttempts) {
          setTimeout(attempt, 100);
        } else {
          clipboardAttempt.destroy();
        }
      };
      attempt();
    }
  }
}