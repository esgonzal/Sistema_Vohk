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
import { operationResponse, addGroupResponse, GetLockTimeResponse, createPasscodeResponse, LockListResponse, sendEkeyResponse } from '../../Interfaces/API_responses';

import { last, lastValueFrom } from 'rxjs';
import moment from 'moment';
import { Clipboard } from '@angular/cdk/clipboard';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as XLSX from 'xlsx';
import { LockData } from 'src/app/Interfaces/Lock';
import { Ekey } from 'src/app/Interfaces/Elements';
import { DarkModeService } from 'src/app/services/dark-mode.service';


@Component({
  selector: 'app-pop-up',
  templateUrl: './pop-up.component.html',
  styleUrls: ['./pop-up.component.css']
})
export class PopUpComponent implements OnInit {
  isLoading: boolean = false;
  name: string;
  passcodePwd: string;
  startDate: string;
  startHour: string;
  endDate: string;
  endHour: string;
  gatewayEncontrado: GatewayAccount | undefined
  redWiFi: string | undefined;
  autoLockToggle = false;
  remoteEnableToggle = false;
  customAutoLockTime: number = 0;
  selectedType = '';
  error = '';
  selectedLocks: { id: number, alias: string }[] = [];
  currentPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  URL = 'https://api.vohkapp.com';
  cardNumber: string = '';
  emailMessage: string;
  public isCopied: boolean = false;
  email: string;
  currentGroup = sessionStorage.getItem("lockGroupID") ?? '';
  locksOfGroup: LockData[] = []
  currentEkey: LockData | undefined
  passcodeDuration = '';
  people: { personName: string; personEmail: string; }[] = [{ personName: '', personEmail: '' }];
  person: { personName: string; personEmail: string; } = { personName: '', personEmail: '' };

  recieverName: string;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    public lockService: LockServiceService,
    private passcodeService: PasscodeServiceService,
    private cardService: CardServiceService,
    private fingerprintService: FingerprintServiceService,
    public gatewayService: GatewayService,
    private groupService: GroupService,
    public dialogRef: MatDialog,
    public userService: UserServiceService,
    public ekeyService: EkeyServiceService,
    public popupService: PopUpService,
    private clipboard: Clipboard,
    private sanitizer: DomSanitizer,
    public DarkModeService: DarkModeService
  ) { }

  async ngOnInit() {
    // Esto es para mostrar los valores actuales del AutoLockTime si es que estaba activado desde antes
    if (this.popupService.emailSuccess) {
      this.emailMessage = this.convertHtmlToPlainText(this.extractHtmlContent(this.popupService.emailMessage));
    }
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
    if (this.popupService.remoteEnable !== null) {
      this.remoteEnableToggle = this.popupService.remoteEnable === 1; // Adjust as needed
    }
    this.selectedLocks = this.ekeyService.selectedLocks;
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
          case 'el código':
            response = await lastValueFrom(this.passcodeService.deletePasscode(this.popupService.userID, this.popupService.lockID, this.popupService.elementID)) as operationResponse;
            if (response?.errcode === 0) {
              this.popupService.delete = false;
              //window.location.reload();
              this.passcodeService.fetchPasscodes(this.popupService.lockID);
            }
            break;
          case 'la ekey':
            response = await lastValueFrom(this.ekeyService.deleteEkey(this.popupService.userID, this.popupService.elementID, this.popupService.lockID, this.popupService.ekeyUsername)) as operationResponse;
            if (response?.errcode === 0) {
              this.popupService.delete = false;
              //window.location.reload();
              this.ekeyService.fetchEkeys(this.popupService.lockID);
            }
            break;
          case 'la tarjeta':
            response = await lastValueFrom(this.cardService.deleteCard(this.popupService.userID, this.popupService.lockID, this.popupService.elementID)) as operationResponse;
            if (response?.errcode === 0) {
              this.popupService.delete = false;
              //window.location.reload();
              this.cardService.fetchCards(this.popupService.lockID);
            }
            break;
          case 'la huella':
            response = await lastValueFrom(this.fingerprintService.deleteFingerprint(this.popupService.userID, this.popupService.lockID, this.popupService.elementID)) as operationResponse;
            if (response?.errcode === 0) {
              this.popupService.delete = false;
              //window.location.reload();
              this.fingerprintService.fetchFingerprints(this.popupService.lockID);
            }
            break;
          case 'grupo':
            response = await lastValueFrom(this.groupService.deleteGroup(this.popupService.userID, this.popupService.elementID.toString())) as operationResponse;
            if (response?.errcode === 0) {
              this.popupService.delete = false;
              //window.location.reload();
              //this.ekeyService.fetchEkeys(this.popupService.lockID);
            }
            break;
          default:
            console.error('Invalid element type for deletion:', this.popupService.elementID);
            break;
        }
      }
      if (response?.errcode === 10003) {
        sessionStorage.clear();
        this.popupService.delete = false;
      } else {
        console.log(response)
        this.error = "La acción eliminar no pudo ser completada, intente nuevamente mas tarde."
      }
    } catch (error) {
      console.error("Error while deleting:", error);
    } finally {
      this.isLoading = false;
    }
  }
  async autorizar() {
    this.isLoading = true;
    let response = await lastValueFrom(this.ekeyService.AuthorizeEkey(this.popupService.userID, this.popupService.lockID, this.popupService.elementID)) as operationResponse;
    if (response.errcode === 0) {
      this.popupService.autorizar = false;
      this.ekeyService.fetchEkeys(this.popupService.lockID);
    }
    this.isLoading = false;
  }
  async desautorizar() {
    this.isLoading = true;
    let response = await lastValueFrom(this.ekeyService.cancelAuthorizeEkey(this.popupService.userID, this.popupService.lockID, this.popupService.elementID)) as operationResponse;
    if (response.errcode === 0) {
      this.popupService.desautorizar = false;
      this.ekeyService.fetchEkeys(this.popupService.lockID);
    }
    this.isLoading = false;
  }
  async congelar() {
    this.isLoading = true;
    try {
      let response = await lastValueFrom(this.ekeyService.freezeEkey(this.popupService.userID, this.popupService.elementID)) as operationResponse;
      //console.log(response)
      if (response.errcode === 0) {
        this.popupService.congelar = false;
        this.ekeyService.fetchEkeys(this.popupService.lockID);
      } else if (response?.errcode === 10003) {
        sessionStorage.clear();
        this.popupService.congelar = false;
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
        this.ekeyService.fetchEkeys(this.popupService.lockID);
      } else if (response?.errcode === 10003) {
        sessionStorage.clear();
        this.popupService.descongelar = false;
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
  async cambiarNombre() {
    this.error = '';
    let response;
    this.isLoading = true;
    try {
      if (!this.name) {
        this.error = "Por favor ingrese un nombre"
      } else {
        if (this.popupService.cambiarNombre) {
          switch (this.popupService.elementType) {
            case 'ekey':
              response = await lastValueFrom(this.ekeyService.modifyEkey(this.popupService.userID, this.popupService.elementID, this.name)) as operationResponse;
              break;
            case 'passcode':
              response = await lastValueFrom(this.passcodeService.changePasscode(this.popupService.userID, this.popupService.lockID, this.popupService.elementID, this.name)) as operationResponse;
              break;
            case 'card':
              response = await lastValueFrom(this.cardService.changeName(this.popupService.userID, this.popupService.lockID, this.popupService.elementID, this.name)) as operationResponse;
              break;
            case 'fingerprint':
              response = await lastValueFrom(this.fingerprintService.changeName(this.popupService.userID, this.popupService.lockID, this.popupService.elementID, this.name)) as operationResponse;
              break;
            case 'grupo':
              response = await lastValueFrom(this.groupService.renameGroup(this.popupService.userID, this.popupService.elementID.toString(), this.name)) as operationResponse;
              break;
            case 'lock':
              response = await lastValueFrom(this.lockService.changeName(this.popupService.userID, this.popupService.lockID, this.name)) as operationResponse;
              sessionStorage.setItem('lockAlias', this.name);
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
        } else if (response?.errcode === -3) {
          this.error = "El nombre ingresado es muy largo"
        } else if (response?.errcode === 10003) {
          sessionStorage.clear();
          this.popupService.cambiarNombre = false;
        } else if (response?.errcode === -3008) {
          this.error = "No se puede editar una passcode que no haya sido usada antes";
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
            case 'passcode':
              response = await lastValueFrom(this.passcodeService.changePasscode(this.popupService.userID, this.popupService.lockID, this.popupService.elementID, undefined, undefined, newStartDate.toString(), newEndDate.toString())) as operationResponse;
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
          if (response?.errcode === 0) {
            this.popupService.cambiarPeriodo = false;
            window.location.reload();
          } else if (response?.errcode === 10003) {
            sessionStorage.clear();
            this.popupService.cambiarPeriodo = false;
          } else if (response?.errcode === -3008) {
            this.error = "No se puede editar una passcode que no haya sido usada antes";
          } else {
            this.error = "La acción cambiar periodo no pudo ser completada, intente nuevamente mas tarde"
            console.log(response)
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
  async editarPasscode() {
    let response;
    let newStartDate;
    let newEndDate;
    this.error = '';
    this.isLoading = true;
    try {
      /*
      if (this.popupService.passcode.keyboardPwdType === 5 || this.popupService.passcode.keyboardPwdType === 6 || this.popupService.passcode.keyboardPwdType === 7 || this.popupService.passcode.keyboardPwdType === 8 || this.popupService.passcode.keyboardPwdType === 9 || this.popupService.passcode.keyboardPwdType === 10 || this.popupService.passcode.keyboardPwdType === 11 || this.popupService.passcode.keyboardPwdType === 12 || this.popupService.passcode.keyboardPwdType === 13 || this.popupService.passcode.keyboardPwdType === 14) {
        let today = moment({ hour: 0, minute: 0 }).valueOf()
        let newStartDate = moment(today).add(this.lockService.transformarHora(this.startHour), "milliseconds").valueOf()
        let newEndDate = moment(today).add(this.lockService.transformarHora(this.endHour), "milliseconds").valueOf()
        response = await lastValueFrom(this.passcodeService.changePasscode(this.popupService.userID, this.popupService.lockID, this.popupService.elementID, this.name, this.passcodePwd, newStartDate.toString(), newEndDate.toString()))
      }
      */
      response = await lastValueFrom(this.passcodeService.changePasscode(this.popupService.userID, this.popupService.lockID, this.popupService.elementID, undefined, this.passcodePwd, undefined, undefined))
      //console.log(response)
      if (response?.errcode === 0) {
        this.popupService.editarPasscode = false;
        window.location.reload();
      } else if (response?.errcode === -3008) {
        this.error = "Para editar este código necesita usarlo al menos una vez";
      } else if (response?.errcode === -3007) {
        this.error = "Por favor ingresa un código diferente";
      } else if (response?.errcode === -3006) {
        this.error = "El código debe tener entre 4 y 9 digitos";//TTLock dice entre 6-9
      } else if (response?.errcode === 10003) {
        sessionStorage.clear();
        this.popupService.editarPasscode = false;
      } else {
        console.log(response);
      }
    } catch (error) {
      console.error("Error while editing a passcode:", error);
    } finally {
      this.isLoading = false;
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
  remoteEnableToggleChange(event: any) {
    this.remoteEnableToggle = event.checked;
    this.cdr.detectChanges()
  }
  async cambiarRemoteUnlock() {
    let remote = '2';
    if (this.remoteEnableToggle === true) {
      remote = '1';
    }
    this.isLoading = true;
    try {
      let response = await lastValueFrom(this.ekeyService.modifyEkey(this.popupService.userID, this.popupService.elementID, undefined, remote)) as operationResponse;
      //console.log(response);
      if (response.errcode === 0) {
        this.popupService.changeRemoteEnable = false;
        window.location.reload();
      } else if (response.errcode === 10003) {
        this.popupService.changeRemoteEnable = false;
        sessionStorage.clear();
      } else {
        console.log(response);
      }
    } catch (error) {
      console.error("Error while changing remote unlock:", error);
    } finally {
      this.isLoading = false;
    }
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
  async crearGrupo() {
    this.error = '';
    this.isLoading = true;
    try {
      if (!this.name) {
        this.error = "Por favor ingrese el nombre"
      } else {
        let response = await lastValueFrom(this.groupService.addGroup(this.popupService.userID, this.name)) as addGroupResponse;
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
        } else {
          this.error = "No se pudo completar la acción, intente nuevamente más tarde";
          console.log(response)
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
  toggleEkeySelection(lockId: number) {
    const index = this.ekeyService.selectedEkeys.indexOf(lockId);
    if (index !== -1) {
      // If lock ID is already in the array, remove it
      this.ekeyService.selectedEkeys.splice(index, 1);
    } else {
      // If lock ID is not in the array, add it
      this.ekeyService.selectedEkeys.push(lockId);
    }
    //console.log("selectedKeyIds: ", this.ekeyService.selectedEkeys)
  }
  toggleLockSelection(lockId: number, lockAlias: string) {
    const index = this.selectedLocks.findIndex(lock => lock.id === lockId);
    if (index !== -1) {
      // If lock ID is already in the array, remove it
      this.selectedLocks.splice(index, 1);
    } else {
      // If lock ID is not in the array, add it with the alias
      this.selectedLocks.push({ id: lockId, alias: lockAlias });
    }
    this.lockService.locksForTransfer = this.selectedLocks;
    console.log("selectedLocks: ", this.selectedLocks);
  }
  toggleHubSelection(hubId: number) {
    const index = this.gatewayService.selectedHubs.findIndex(hub => hub.id === hubId);
    if (index !== -1) {
      // If lock ID is already in the array, remove it
      this.gatewayService.selectedHubs.splice(index, 1);
    } else {
      // If lock ID is not in the array, add it with the alias
      this.gatewayService.selectedHubs.push({ id: hubId });
    }
    console.log("selectedHubs: ", this.gatewayService.selectedHubs);
  }
  async removeSelectedLocksFromGroup() {
    this.isLoading = true;
    try {
      if (this.selectedLocks.length === 0) {
        this.error = "No seleccionó ninguna cerradura para remover"
      } else {
        for (const lock of this.selectedLocks) {
          let response = await lastValueFrom(this.groupService.setGroupofLock(this.popupService.userID, lock.id.toString(), "0")) as operationResponse;
          if (response.errcode === 0) {
          } else if (response?.errcode === 10003) {
            sessionStorage.clear();
            this.popupService.removeLockGROUP = false;
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
      if (this.selectedLocks.length === 0) {
        this.error = "No seleccionó ninguna cerradura para agregar"
      } else {
        for (const lock of this.selectedLocks) {
          let response = await lastValueFrom(this.groupService.setGroupofLock(this.popupService.userID, lock.id.toString(), this.popupService.group.groupId.toString())) as operationResponse;
          if (response.errcode === 0) {
          } else if (response.errcode === 10003) {
            sessionStorage.clear();
            this.popupService.addLockGROUP = false;
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
    return this.ekeyService.selectedLocks.some(lock => lock.id === lockId);
  }
  isHubSelected(hubId: number): boolean {
    return this.gatewayService.selectedHubs.some(hub => hub.id === hubId);
  }
  isEkeySelected(keyId: number): boolean {
    return this.ekeyService.selectedEkeys.includes(keyId);
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
  getCardNumber(datos: Formulario) {
    console.log(datos.name)
  }
  extractHtmlContent(safeHtml: SafeHtml): string {
    return this.sanitizer.sanitize(SecurityContext.HTML, safeHtml) || '';
  }
  convertHtmlToPlainText(htmlContent: string): string {
    const tempElement = document.createElement('div');
    tempElement.innerHTML = htmlContent;
    // Get plain text and replace <p> tags with newlines
    let plainText = tempElement.textContent || tempElement.innerText || '';
    // Optional: Clean up extra spaces or blank lines if needed
    plainText = plainText.replace(/\n\s*\n/g, '\n').trim();
    return plainText;
  }
  convertPlainTextToHtml(plainText: string): string {
    // Split the plain text into paragraphs based on newlines
    const paragraphs = plainText.split(/\n+/).filter(line => line.trim() !== '');
    // Wrap each paragraph in <p> tags and join them
    const htmlContent = paragraphs.map(para => `<p>${para.trim()}</p>`).join('\n');
    return htmlContent;
  }
  cancelEmail() {
    this.popupService.emailSuccess = false;
  }
  async saveEmail() {
    this.isLoading = true;
    try {
      //const updatedHtml = this.convertPlainTextToHtml(this.emailMessage);
      //this.popupService.emailMessage = updatedHtml; // Save as HTML
      let response = await lastValueFrom(this.ekeyService.sendEmail(this.popupService.toEmail, this.popupService.emailMessage)) as sendEkeyResponse;
      console.log(response)
      if (response.success) {
        this.isLoading = false;
        this.popupService.emailSuccess = false
        this.popupService.createEkey = false;
        window.location.reload();
      }
    } catch (error) {
      console.error("Error while sending Email:", error);
      this.isLoading = false;
    } finally {
      this.isLoading = false;
    }
    
    
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
  exportToExcel(): void {
    if (this.name !== undefined) {
      const cleanedRecords = this.popupService.records.map(record => ({
        Operador: record.username,
        Metodo_Apertura: this.lockService.consultarMetodo(record.recordTypeFromLock, record.username),
        Horario_Apertura: this.lockService.formatTimestamp(record.lockDate),
        Estado: this.lockService.consultarSuccess(record.success),
      }));
      const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(cleanedRecords);
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, this.name.concat('.xlsx'));
      this.popupService.excelNameWindow = false;
    } else {
      this.error = "Por favor ingrese un nombre"
    }
  }
  async createTemporalPasscode() {
    let response;
    let code: string;
    let start: string;
    let end: string;
    this.isLoading = true;
    if (!this.name) {
      this.error = "Por favor ingrese un nombre para el código"
    } else if (!this.passcodeDuration) {
      this.error = "Por favor seleccione una duración para el código";
    } else {
      try {
        //PERIODIC PASSCODE
        let ahora = moment().valueOf();
        let final = moment(ahora).add(parseInt(this.passcodeDuration), 'hours').valueOf();
        response = (await lastValueFrom(this.passcodeService.generatePasscode(this.popupService.userID, this.popupService.lockID, '3', ahora.toString(), this.name, final.toString()))) as createPasscodeResponse;
        if (response?.keyboardPwdId) {
          code = response.keyboardPwd;
          start = moment(ahora).format('DD/MM/YYYY HH:mm');
          end = moment(final).format('DD/MM/YYYY HH:mm');
          this.people.forEach(async person => {
            let emailResponse = await lastValueFrom(this.passcodeService.sendEmail(person.personName, person.personEmail, this.name, code, this.popupService.lock_alias, start, end)) as sendEkeyResponse;
            if (emailResponse.emailContent) {
              this.popupService.temporalPasscode = false;
              this.popupService.temporalPasscode2 = false;
              this.popupService.passcodeSuccess = true;
              //window.location.reload();
            }
          })

        } else if (response?.errcode === 10003) {
          sessionStorage.clear();
        } else {
          console.log('ERROR:', response);
        }
      } catch (error) {
        console.error('Error while creating Passcode:', error);
      } finally {
        //this.popupService.temporalPasscode = false;
        //window.location.reload();
        this.isLoading = false;
      }
    }
  }
  confirmLockSelection() {
    this.ekeyService.selectedLocks = this.selectedLocks;
  }
  sharePasscode() {
    if (!this.name) {
      this.error = "Por favor introduzca el nombre o motivo de la invitación"
    } else if (!this.passcodeDuration) {
      this.error = "Por favor seleccione una duración de invitación"
    } else {
      this.popupService.temporalPasscode = false;
      this.popupService.temporalPasscode2 = true;
    }

  }
  closeSharePasscode() {
    this.popupService.temporalPasscode2 = false;
    this.popupService.temporalPasscode = true;
  }
  addPerson() {
    this.people.push({ personName: '', personEmail: '' });
    this.person = { personName: '', personEmail: '' };
  }
  removePerson(index: number) {
    this.people.splice(index, 1);
  }
  closeWindow() {
    this.popupService.ekeySuccess = false;
    this.popupService.passcodeSuccess = false;
    this.popupService.cardSuccess = false;
    this.popupService.ekeySuccess2 = false;
    window.location.reload()
  }
}