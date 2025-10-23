import { ChangeDetectorRef, Component, OnInit, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import moment from 'moment';
import { lastValueFrom } from 'rxjs';
import { InvitationResponse, operationResponse } from 'src/app/Interfaces/API_responses';
import { Formulario } from 'src/app/Interfaces/Formulario';
import { CardServiceService } from 'src/app/services/card-service.service';
import { DarkModeService } from 'src/app/services/dark-mode.service';
import { EkeyServiceService } from 'src/app/services/ekey-service.service';
import { FingerprintServiceService } from 'src/app/services/fingerprint-service.service';
import { GroupService } from 'src/app/services/group.service';
import { LockServiceService } from 'src/app/services/lock-service.service';
import { PasscodeServiceService } from 'src/app/services/passcode-service.service';
import { PopUpService } from 'src/app/services/pop-up.service';
import { Clipboard } from '@angular/cdk/clipboard';

@Component({
  selector: 'app-access-modal',
  templateUrl: './access-modal.component.html',
  styleUrls: ['./access-modal.component.css']
})
export class AccessModalComponent implements OnInit {
  isLoading: boolean = false;
  error = '';
  remoteEnableToggle = false;
  name: string;
  email: string;
  passcodePwd: string;
  selectedLocks: { id: number, alias: string }[] = [];
  userID = sessionStorage.getItem('user') ?? ''
  public isCopied: boolean = false;
  emailMessage: string;

  constructor(
    public DarkModeService: DarkModeService,
    public popupService: PopUpService,
    public passcodeService: PasscodeServiceService,
    public ekeyService: EkeyServiceService,
    private cardService: CardServiceService,
    private fingerprintService: FingerprintServiceService,
    private groupService: GroupService,
    private cdr: ChangeDetectorRef,
    public lockService: LockServiceService,
    private sanitizer: DomSanitizer,
    private clipboard: Clipboard) { }

  ngOnInit() {
    this.selectedLocks = this.passcodeService.selectedLocks;
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
    this.error = '';
    this.isLoading = true;
    try {
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
  closeWindow() {
    this.popupService.ekeySuccess = false;
    this.popupService.passcodeSuccess = false;
    this.popupService.cardSuccess = false;
    this.popupService.ekeySuccess2 = false;
    window.location.reload()
  }
  openLockSelector() {
    this.popupService.invitation = false;
    this.popupService.selectLocksForPasscode = true;
  }
  selectLocks() {
    this.popupService.selectLocksForPasscode = false;
    this.popupService.invitation = true;
  }
  isLockSelected(lockId: number): boolean {
    return this.passcodeService.selectedLocks.some(lock => lock.id === lockId);
  }
  async createInvitation() {
    if (!this.name) {
      this.error = "Por favor introduzca el nombre o motivo de la invitación";
      return;
    }
    if (!this.passcodePwd) {
      this.error = "Por favor introduzca el código";
      return;
    } else {
      try {
        this.isLoading = true;
        const ahora = moment().valueOf();
        const final = moment(ahora).add(parseInt('3'), 'hours').valueOf();
        let response = await (lastValueFrom(this.passcodeService.generateCustomPasscode2(this.userID, this.passcodeService.selectedLocks, this.passcodePwd, '3', this.name, ahora.toString(), final.toString(), this.email))) as InvitationResponse;
        if (response.email?.emailSent) {
          this.emailMessage = response.email.emailContent;
          this.popupService.emailSentInvitation = true;
          this.popupService.invitation = false;
        } else {
          console.log('ERROR:', response);
        }
      } catch (error) {
        console.error('Error while creating Passcode:', error);
      } finally {
        this.isLoading = false;
      }
    }
  }
  closeSentInvitation() {
    this.popupService.emailSentInvitation = false;
  }
  copyToClipboard() {
    const emailContent = this.emailMessage;
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
  confirmLockSelection() {
    this.passcodeService.selectedLocks = this.selectedLocks;
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
  closeMultiplePasscodes() {
    this.popupService.multiplePasscodesResult = false;
    window.location.reload();
  }
  closeMultipleCards() {
    this.popupService.multipleCardsResult = false;
    window.location.reload();
  }
}
