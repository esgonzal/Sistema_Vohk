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
  transformarRemoteEnable(Slider: boolean) {
    if (Slider) {
      return '1'
    } else {
      return '2'
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
  exportToExcel1(): void {
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
  exportToExcel(): void {
    if (!this.name) {
      this.error = "Por favor ingrese un nombre";
      return;
    }
    const cleanedRecords = this.popupService.records.map(record => {
      const row: any = {};
      if ([1, 26, 28, 41].includes(record.recordTypeFromLock)) {//Abrir con la aplicación
        row.Operador = record.keyName;
      } else {
        row.Operador = record.username;
      }
      row.Metodo_Apertura = this.lockService.consultarMetodo(record.recordTypeFromLock, record.username);
      row.Horario_Apertura = this.lockService.formatTimestamp(record.lockDate);
      row.Estado = this.lockService.consultarSuccess(record.success);
      if ([1, 26, 28, 41].includes(record.recordTypeFromLock)) {//Abrir con la aplicación
        row.Cuenta = record.username
      }
      if ([4,7].includes(record.recordTypeFromLock)) {//Abrir con código de acceso
        row.Codigo = record.keyboardPwd
      }
      return row;
    });
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(cleanedRecords, {
      header: ['Operador', 'Metodo_Apertura', 'Horario_Apertura', 'Estado', 'Cuenta', 'Codigo']
    });
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, this.name.concat('.xlsx'));
    this.popupService.excelNameWindow = false;
  }
  exportFingerprintsToExcel(): void {
    if (this.name !== undefined) {
      const cleanedFingerprints = this.popupService.fingerprints.map(fingerprint => ({
        ID: fingerprint.fingerprintId,
        Nombre: fingerprint.fingerprintName,
        Creador: fingerprint.senderUsername,
        Tiempo_de_Asignación: this.lockService.formatTimestamp(fingerprint.createDate),
        Periodo_de_Validez: this.lockService.periodoValidezFingerprint(fingerprint),
      }));
      const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(cleanedFingerprints);
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, this.name.concat('.xlsx'));
      this.popupService.excelFingerprints = false;
    } else {
      this.error = "Por favor ingrese un nombre"
    }
  }
  
  confirmLockSelection() {
    this.ekeyService.selectedLocks = this.selectedLocks;
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
}