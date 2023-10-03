import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { faBatteryFull, faBatteryThreeQuarters, faBatteryHalf, faBatteryQuarter, faBatteryEmpty, faGear, faWifi } from '@fortawesome/free-solid-svg-icons'
import moment from 'moment';
import { LockData, LockDetails } from '../../Interfaces/Lock';
import { Ekey, Passcode, Card, Fingerprint, Record } from '../../Interfaces/Elements';
import { LockServiceService } from '../../services/lock-service.service';
import { EkeyServiceService } from '../../services/ekey-service.service';
import { PasscodeServiceService } from '../../services/passcode-service.service';
import { CardServiceService } from '../../services/card-service.service';
import { FingerprintServiceService } from '../../services/fingerprint-service.service';
import { RecordServiceService } from '../../services/record-service.service';
import { PopUpService } from '../../services/pop-up.service';
import { GatewayService } from '../../services/gateway.service';
import { PassageModeService } from '../../services/passage-mode.service';
import { GroupService } from 'src/app/services/group.service';
import { DomSanitizer } from '@angular/platform-browser';
import { Group } from '../../Interfaces/Group';
import { lastValueFrom } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { UserServiceService } from 'src/app/services/user-service.service';
import { RecordResponse, EkeyResponse, PasscodeResponse, CardResponse, FingerprintResponse, GatewayAccountResponse, GatewayLockResponse, operationResponse, GetLockTimeResponse, LockListResponse, GroupResponse, getByUserAndLockIdResponse } from '../../Interfaces/API_responses';
import { PassageMode } from 'src/app/Interfaces/PassageMode';
import { MatTabChangeEvent } from '@angular/material/tabs';

@Component({
  selector: 'app-lock',
  templateUrl: './lock.component.html',
  styleUrls: ['./lock.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class LockComponent implements OnInit {
  pageLoaded = false;
  //encapsulation: ViewEncapsulation.None;
  ////////////////////////////////////////////////////////////
  faBatteryFull = faBatteryFull
  faBatteryThreeQuarters = faBatteryThreeQuarters
  faBatteryHalf = faBatteryHalf
  faBatteryQuarter = faBatteryQuarter
  faBatteryEmpty = faBatteryEmpty
  faGear = faGear
  faWifi = faWifi
  ////////////////////////////////////////////////////////////
  isLoading: boolean = false;
  lockDetails: LockDetails;
  token = sessionStorage.getItem('token') ?? '';
  username = sessionStorage.getItem('user') ?? ''
  lockId: number = Number(sessionStorage.getItem('lockID') ?? '')
  userType = sessionStorage.getItem('userType') ?? '';
  keyRight = sessionStorage.getItem('keyRight') ?? '';
  startDateDeUser = sessionStorage.getItem('startDate') ?? '';
  endDateDeUser = sessionStorage.getItem('endDate') ?? '';
  Alias: string;
  Bateria: string
  gateway:string;
  featureValue:string;
  ////////////////////////////////////////////////////////////
  ekeys: Ekey[] = []
  passcodes: Passcode[] = []
  fingerprints: Fingerprint[] = []
  cards: Card[] = []
  records: Record[] = []
  recordsFiltrados: Record[] = []
  passcodesFiltradas: Passcode[] = []
  allLocks: LockData[] = [];
  locks: LockData[] = [];
  locksWithoutGroup: LockData[] = [];
  groups: Group[] = []
  ////////////////////////////////////////////////////////////
  selectedTabIndex = 0;
  ekeysDataSource: MatTableDataSource<Ekey>;
  passcodesDataSource: MatTableDataSource<Passcode>;
  cardsDataSource: MatTableDataSource<Card>;
  fingerprintsDataSource: MatTableDataSource<Fingerprint>;
  recordsDataSource: MatTableDataSource<Record>;
  displayedColumnsEkey: string[] = ['username', 'rol', 'senderUsername', 'date', 'Asignacion', 'Estado', 'Operacion']
  displayedColumnsPasscode: string[] = ['keyboardPwdName', 'keyboardPwd', 'senderUsername', 'createDate', 'Asignacion', 'Estado', 'Operacion']
  displayedColumnsCard: string[] = ['cardName', 'cardNumber', 'senderUsername', 'createDate', 'Asignacion', 'Estado', 'Operacion']
  displayedColumnsFingerprint: string[] = ['fingerprintName', 'senderUsername', 'createDate', 'Asignacion', 'Estado', 'Operacion']
  displayedColumnsRecord: string[] = ['Operador', 'Metodo_Apertura', 'Horario_Apertura', 'Estado']
  isUserValue: boolean;

  constructor(
    private router: Router,
    public popupService: PopUpService,
    public lockService: LockServiceService,
    private ekeyService: EkeyServiceService,
    private passcodeService: PasscodeServiceService,
    private cardService: CardServiceService,
    private fingerprintService: FingerprintServiceService,
    private recordService: RecordServiceService,
    private gatewayService: GatewayService,
    private passageModeService: PassageModeService,
    private sanitizer: DomSanitizer,
    public userService: UserServiceService,
    private groupService: GroupService
  ) { }

  featureList = [
    { bit: 0, feature: "Passcode" },
    { bit: 1, feature: "Card" },
    { bit: 2, feature: "Fingerprint" },
    { bit: 3, feature: "Wrist strap" },
    { bit: 4, feature: "Support configuration of auto lock time" },
    { bit: 5, feature: "Support clear passcode" },
    { bit: 6, feature: "Firmware upgrade" },
    { bit: 7, feature: "Management of passcodes" },
    { bit: 8, feature: "Support lock command" },
    { bit: 9, feature: "Hide or display the passcodes, you can control it." },
    { bit: 10, feature: "Support unlocking via gateway" },
    { bit: 11, feature: "Support freeze and unfreeze lock" },
    { bit: 12, feature: "Support cyclic passcodes" },
    { bit: 13, feature: "Support door sensor" },
    { bit: 14, feature: "Support configuration of unlocking via gateway, turn on or turn off it." },
    { bit: 15, feature: "Voice prompts management, turn on or turn off it." },
    { bit: 16, feature: "NB-IoT" },
    { bit: 17, feature: "This bit is discarded" },
    { bit: 18, feature: "Support query of super passcode" },
    { bit: 19, feature: "Support hotel card" },
    { bit: 20, feature: "The lock does not have a clock chip" },
    { bit: 21, feature: "When the lock's Bluetooth is not broadcasting, you cannot unlock via APP." },
    { bit: 22, feature: "Passage mode" },
    { bit: 23, feature: "When you have set the auto lock of passage mode, turn off auto lock is supported" },
    { bit: 24, feature: "Wireless keypad" },
    { bit: 25, feature: "Support time config of the light." },
    { bit: 26, feature: "Support blacklist of hotel card" },
    { bit: 27, feature: "Support ID card" },
    { bit: 28, feature: "Tamper Alert can be turned on and turned off." },
    { bit: 29, feature: "Reset Button can be turned on and turned off." },
    { bit: 30, feature: "Privacy Lock can be turned on and turned off." },
    { bit: 31, feature: "This bit is not used" },
    { bit: 32, feature: "Support deadlock" },
    { bit: 33, feature: "Support exception of passage mode" },
    { bit: 34, feature: "Support cyclic card and fingerprint" },
    { bit: 35, feature: "Privacy lock can be controlled by APP" },
    { bit: 36, feature: "Support setting of open direction" },
    { bit: 37, feature: "Support Finger vein" },
    { bit: 38, feature: "Telink bluetooth chip" },
    { bit: 39, feature: "NB-IoT activate mode can be configured" },
    { bit: 40, feature: "Support recovery of cyclic passcode" },
    { bit: 41, feature: "Support wireless keyfob (remote control)" },
    { bit: 42, feature: "Support query of accessory battery level" },
    { bit: 43, feature: "Configuration of sound volume and language is supported" },
    { bit: 44, feature: "Support QR code" },
    { bit: 45, feature: "Support unknown status of door sensor" },
    { bit: 46, feature: "Auto unlock in passage mode" },
    { bit: 47, feature: "Support adding fingerprint via gateway" },
    { bit: 48, feature: "Support Miaxis fingerprint data" },
    { bit: 49, feature: "Support Syno fingerprint data" },
    { bit: 50, feature: "Support wireless door sensor" },
    { bit: 51, feature: "Support alert when door is not locked" },
    { bit: 53, feature: "Support 3D face" },
    { bit: 55, feature: "Support CPU card" },
    { bit: 56, feature: "Support WiFi" },
    { bit: 58, feature: "WiFi lock which supports fixed IP address" },
    { bit: 60, feature: "Support incomplete keyboard passcode" },
    { bit: 63, feature: "Support dual certification" },
    { bit: 67, feature: "Support Xmsilicon visual intercom" },
    { bit: 69, feature: "Support Zhiantec face module" },
    { bit: 70, feature: "Support palm vein" },
  ];

  async ngOnInit() {
    await this.fetchEkeys();
    await this.getAllLocks();
    await this.fetchGroups();
    await this.fetchLockDetails();
    //console.log("Los detalles del lock: ", this.lockDetails)
    this.Alias = this.lockDetails.lockAlias;
    this.Bateria = this.lockDetails.electricQuantity.toString();
    this.gateway = this.lockDetails.hasGateway.toString();
    this.featureValue = this.lockDetails.featureValue;
    for (const feature of this.featureList) {
      const isSupported = this.lockService.checkFeature(this.featureValue, feature.bit);
      if (isSupported) {
        //console.log(`${feature.bit} - ${feature.feature} - ${isSupported}`);
      }
    }
    this.ekeysDataSource = new MatTableDataSource(this.ekeys);
    if(sessionStorage.getItem('Account') === 'Vohk'){
      this.isUserValue = await this.isUser(this.encodeNombre(this.username))
    } else {
      this.isUserValue = await this.isUser(this.username);
    }
    this.pageLoaded = true;
  }
  async getAllLocks() {
    this.isLoading = true;
    try {
      let pageNo = 1;
      const pageSize = 100;
      while (true) {
        const locksResponse = await lastValueFrom(this.ekeyService.getEkeysofAccount(this.token, pageNo, pageSize, 0));
        const locksTypedResponse = locksResponse as LockListResponse;
        if (locksTypedResponse?.list) {
          this.allLocks.push(...locksTypedResponse.list)
          this.locksWithoutGroup.push(...locksTypedResponse.list.filter(lock => !lock.groupId))
          if (locksTypedResponse.pages > pageNo) {
            pageNo++;
          } else {
            break; // No more pages to fetch
          }
        } else {
          break; // No more locks to fetch
        }
      }
      this.ekeyService.currentLocks = this.allLocks.filter(
        lock => lock.userType === '110301' || (lock.userType === '110301' && lock.keyRight === 1)
      );
      this.groupService.locksWithoutGroup = this.locksWithoutGroup;
    } catch (error) {
      console.error("Error while fetching all locks:", error);
    } finally {
      this.isLoading = false;
    }
  }
  async fetchGroups() {
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.groupService.getGroupofAccount(this.token));
      const typedResponse = response as GroupResponse;
      if (typedResponse?.list) {
        this.groups = typedResponse.list;
        // Fetch locks and calculate lock counts for each group
        for (const group of this.groups) {
          group.lockCount = await this.calculateLockCountForGroup(group);
        }
      } else {
        console.log("Groups not yet available");
      }
    } catch (error) {
      console.error("Error while fetching groups:", error);
    } finally {
      this.isLoading = false; // Set isLoading to false when data fetching is complete
    }
    this.groupService.groups = this.groups;
  }
  async calculateLockCountForGroup(group: Group): Promise<number> {
    let lockCount = 0;
    let pageNo = 1;
    const pageSize = 100;
    group.locks = [];
    while (true) {
      const locksResponse = await lastValueFrom(this.ekeyService.getEkeysofAccount(this.token, pageNo, pageSize, group.groupId));
      const locksTypedResponse = locksResponse as LockListResponse;
      if (locksTypedResponse?.list && locksTypedResponse.list.length > 0) {
        lockCount += locksTypedResponse.list.length;
        group.locks.push(...locksTypedResponse.list);
        if (locksTypedResponse.pages > pageNo) {
          pageNo++;
        } else {
          break; // No more pages to fetch
        }
      } else {
        break; // No more locks to fetch
      }
    }
    return lockCount;
  }
  async fetchLocks(groupId: number) {
    this.isLoading = true;
    try {
      await this.fetchLocksPage(1, groupId);
    } catch (error) {
      console.error("Error while fetching Locks: ", error);
    } finally {
      this.isLoading = false; // Set isLoading to false when data fetching is complete
    }
    //console.log("Locks actuales", this.locks)
  }
  async fetchLocksPage(pageNo: number, groupId?: number) {
    this.locks = [];
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.ekeyService.getEkeysofAccount(this.token, pageNo, 100, groupId));
      const typedResponse = response as LockListResponse;
      if (typedResponse?.list) {
        this.locks.push(...typedResponse.list);
        if (typedResponse.pages > pageNo) {
          await this.fetchLocksPage(pageNo + 1, groupId);
        }
      } else {
        console.log("Locks not yet available")
      }
    } catch (error) {
      console.error("Error while fetching locks page:", error)
    } finally {
      this.isLoading = false; // Set isLoading to false when data fetching is complete
    }
  }
  async fetchEkeys() {
    this.isLoading = true;
    try {
      await this.fetchEkeysPage(1);
    } catch (error) {
      console.error("Error while fetching ekeys:", error);
    } finally {
      this.isLoading = false; // Set isLoading to false when data fetching is complete
    }
  }
  async fetchEkeysPage(pageNo: number) {
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.ekeyService.getEkeysofLock(this.token, this.lockId, pageNo, 100))
      const typedResponse = response as EkeyResponse;
      if (typedResponse?.list) {
        for (const ekey of typedResponse.list) {
          ekey.isuser = await this.isUser(ekey.username);
        }

        this.ekeys.push(...typedResponse.list);
        if (typedResponse.pages > pageNo) {
          await this.fetchEkeysPage(pageNo + 1);
        }
      } else {
        console.log("Ekeys not yet available");
      }
    } catch (error) {
      console.error("Error while fetching ekeys page:", error);
    } finally {
      this.isLoading = false; // Set isLoading to false when data fetching is complete
    }
  }
  async fetchPasscodes() {
    this.isLoading = true;
    try {
      await this.fetchPasscodesPage(1);
    } catch (error) {
      console.error("Error while fetching passcodes:", error);
    } finally {
      this.isLoading = false; // Set isLoading to false when data fetching is complete
    }
  }
  async fetchPasscodesPage(pageNo: number) {
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.passcodeService.getPasscodesofLock(this.token, this.lockId, pageNo, 100))
      const typedResponse = response as PasscodeResponse;
      if (typedResponse?.list) {
        this.passcodes.push(...typedResponse.list);
        if (typedResponse.pages > pageNo) {
          await this.fetchPasscodesPage(pageNo + 1);
        }
      } else {
        console.log("Passcodes not yet available");
      }
    } catch (error) {
      console.error("Error while fetching passcodes page:", error);
    } finally {
      this.isLoading = false; // Set isLoading to false when data fetching is complete
    }
  }
  async fetchCards() {
    this.isLoading = true;
    try {
      await this.fetchCardsPage(1);
    } catch (error) {
      console.error("Error while fetching cards:", error);
    } finally {
      this.isLoading = false; // Set isLoading to false when data fetching is complete
    }
  }
  async fetchCardsPage(pageNo: number) {
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.cardService.getCardsofLock(this.token, this.lockId, pageNo, 100))
      const typedResponse = response as CardResponse;
      if (typedResponse?.list) {
        this.cards.push(...typedResponse.list);
        if (typedResponse.pages > pageNo) {
          await this.fetchCardsPage(pageNo + 1);
        }
      } else {
        console.log("Cards not yet available");
      }
    } catch (error) {
      console.error("Error while fetching cards page:", error);
    } finally {
      this.isLoading = false; // Set isLoading to false when data fetching is complete
    }
  }
  async fetchFingerprints() {
    this.isLoading = true;
    try {
      await this.fetchFingerprintsPage(1);
    } catch (error) {
      console.error("Error while fetching fingerprints:", error);
    } finally {
      this.isLoading = false; // Set isLoading to false when data fetching is complete
    }
  }
  async fetchFingerprintsPage(pageNo: number) {
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.fingerprintService.getFingerprintsofLock(this.token, this.lockId, pageNo, 100))
      const typedResponse = response as FingerprintResponse;
      if (typedResponse?.list) {
        this.fingerprints.push(...typedResponse.list);
        if (typedResponse.pages > pageNo) {
          await this.fetchFingerprintsPage(pageNo + 1);
        }
      } else {
        console.log("Fingerprints not yet available");
      }
    } catch (error) {
      console.error("Error while fetching fingerprints page:", error);
    } finally {
      this.isLoading = false; // Set isLoading to false when data fetching is complete
    }
  }
  async fetchRecords() {
    this.isLoading = true;
    try {
      await this.fetchRecordsPage(1);
    } catch (error) {
      console.error("Error while fetching records:", error);
    } finally {
      this.isLoading = false; // Set isLoading to false when data fetching is complete
    }
  }
  async fetchRecordsPage(pageNo: number) {
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.recordService.getRecords(this.token, this.lockId, pageNo, 100))
      const typedResponse = response as RecordResponse;
      if (typedResponse?.list) {
        this.records.push(...typedResponse.list);
        if (typedResponse.pages > pageNo) {
          await this.fetchRecordsPage(pageNo + 1);
        }
      } else {
        console.log("Records not yet available");
      }
    } catch (error) {
      console.error("Error while fetching records page:", error);
    } finally {
      this.isLoading = false; // Set isLoading to false when data fetching is complete
    }
  }
  async fetchGatewaysAccount() {
    this.isLoading = true;
    try {
      await this.fetchGatewaysAccountPage(1);
    } catch (error) {
      console.error("Error while fetching gateways of an account:", error)
    } finally {
      this.isLoading = false; // Set isLoading to false when data fetching is complete
    }
  }
  async fetchGatewaysAccountPage(pageNo: number) {
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.gatewayService.getGatewaysAccount(this.token, pageNo, 100))
      const typedResponse = response as GatewayAccountResponse;
      if (typedResponse?.list) {
        this.popupService.gatewaysOfAccount.push(...typedResponse.list);
        if (typedResponse.pages > pageNo) {
          await this.fetchGatewaysAccountPage(pageNo + 1)
        }
      } else {
        console.log("Gateways not yet available");
      }
    } catch (error) {
      console.error("Error while fetching gateways page:", error);
    } finally {
      this.isLoading = false; // Set isLoading to false when data fetching is complete
    }
  }
  async fetchGatewaysLock() {
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.gatewayService.getGatewayListOfLock(this.token, this.lockId));
      const typedResponse = response as GatewayLockResponse;
      if (typedResponse.list) {
        this.popupService.gatewaysOfLock.push(...typedResponse.list)
      } else {
        console.log("Gateways of the lock not yet available");
      }
    } catch (error) {
      console.error("Error while fetching gateways of a lock:", error)
    } finally {
      this.isLoading = false; // Set isLoading to false when data fetching is complete
    }
  }
  async fetchLockDetails() {
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.lockService.getLockDetails(this.token, this.lockId)) as LockDetails
      if (response.lockId) {
        this.lockDetails = response;
      } else {
        console.log(response)
      }
    } catch (error) {
      console.error("Error while fetching details of a lock:", error)
    } finally {
      this.isLoading = false; // Set isLoading to false when data fetching is complete
    }
  }
  updatePasscodeUsage() {
    for (const passcode of this.passcodes) {
      const usedRecord = this.records.find(record => record.keyboardPwd === passcode.keyboardPwd && record.success === 1);
      if (usedRecord) { passcode.hasBeenUsed = true }
    }
  }
  //FUNCIONES PARA FORMATO DE TABLA
  async onTabChanged(event: MatTabChangeEvent): Promise<void> {
    this.selectedTabIndex = event.index;
    switch (this.selectedTabIndex) {
      case 0:
        this.ekeys = [];
        await this.fetchEkeys();
        this.ekeysDataSource = new MatTableDataSource(this.ekeys);
        //console.log("eKeys: ", this.ekeys)
        break;
      case 1:
        this.passcodes = [];
        await this.fetchPasscodes();
        this.updatePasscodeUsage()
        this.passcodesDataSource = new MatTableDataSource(this.passcodes);
        this.passcodesFiltradas = this.passcodes.filter(passcode => passcode.senderUsername === this.encodeNombre(this.username));
        //console.log("Passcodes: ", this.passcodes)
        break;
      case 2:
        this.cards = [];
        await this.fetchCards();
        this.cardsDataSource = new MatTableDataSource(this.cards);
        //console.log("Cards: ", this.cards)
        break;
      case 3:
        this.fingerprints = [];
        await this.fetchFingerprints();
        this.fingerprintsDataSource = new MatTableDataSource(this.fingerprints);
        //console.log("Fingerprints: ", this.fingerprints)
        break;
      case 4:
        this.records = [];
        await this.fetchRecords();
        this.recordsDataSource = new MatTableDataSource(this.records);
        this.recordsFiltrados = this.records.filter(record => record.username === this.encodeNombre(this.username));
        //console.log("Records: ", this.records)
        break;
    }
  }
  Number(palabra: string) {
    return Number(palabra)
  }
  async isUser(username: string) {
    let response = await lastValueFrom(this.ekeyService.getIsUser(username, this.lockId)) as getByUserAndLockIdResponse;
    if(response.isuser) {
      return response.isuser;
    } else {
      return false
    }
  }
  encodeNombre(username: string) {
    let prefijo = 'bhaaa_'
    return prefijo.concat(this.userService.customBase64Encode(username))
  }
  decodeNombre(username: string) {
    if (username) {
      let nombre_dividido = username.split("_");
      if (nombre_dividido[0] === 'bhaaa') {
        return this.userService.customBase64Decode(nombre_dividido[1])
      } else {
        return username;
      }
    } else {
      return username;
    }
  }
  periodoValidez(start: number, end: number) {
    if (end === 0) { return 'Permanente' }
    else {
      var inicio = moment(start).format("YYYY/MM/DD HH:mm")
      var final = moment(end).format("YYYY/MM/DD HH:mm")
      var retorno = inicio.toString().concat(' - ').concat(final.toString());
      return retorno
    }
  }
  periodoValidezEkey(ekey: Ekey) {
    if (this.Number(ekey.endDate) === 1) {//UNA VEZ
      let retorno = moment(ekey.startDate).format('YYYY/MM/DD HH:mm').concat(" Una vez");
      return retorno;
    }
    if (ekey.keyType === 4) {//SOLICITANTE
      const dayNames = ["Sabado", "Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes"];
      let HoraInicio = moment(ekey.startDate).format('HH:mm');
      let HoraFinal = moment(ekey.endDate).format('HH:mm');
      let DiaInicio = moment(ekey.startDay).format('YYYY/MM/DD');
      let DiaFinal = moment(ekey.endDay).format('YYYY/MM/DD');
      let selectedDays = JSON.parse(ekey.weekDays);
      let formattedSelectedDays = selectedDays.map((day: number) => dayNames[day]).join(', ');

      let formattedResult = `${DiaInicio} - ${DiaFinal}, ${formattedSelectedDays}, ${HoraInicio} ~ ${HoraFinal}`;
      return formattedResult
    }
    else { return this.periodoValidez(Number(ekey.startDate), Number(ekey.endDate)) }
  }
  periodoValidezPasscode(passcode: Passcode) {
    var respuesta
    if (passcode.keyboardPwdType === 1) {
      respuesta = moment(passcode.sendDate).format("YYYY/MM/DD HH:mm").concat(' Una Vez');
    }
    if (passcode.keyboardPwdType === 2) {
      respuesta = 'Permanente'
    }
    if (passcode.keyboardPwdType === 3) {
      var inicio = moment(passcode.startDate).format("YYYY/MM/DD HH:mm")
      var final = moment(passcode.endDate).format("YYYY/MM/DD HH:mm")
      respuesta = inicio.toString().concat(' - ').concat(final.toString());
    }
    if (passcode.keyboardPwdType === 4) {
      respuesta = moment(passcode.sendDate).format("YYYY/MM/DD HH:mm").concat(' Borrar');
    }
    if (passcode.keyboardPwdType === 5) {
      var inicio = moment(passcode.startDate).format(" HH:mm")
      var final = moment(passcode.endDate).format(" HH:mm")
      respuesta = moment(passcode.sendDate).format("YYYY/MM/DD HH:mm").concat(", ", inicio, " - ", final, " Fin de Semana")
    }
    if (passcode.keyboardPwdType === 6) {
      var inicio = moment(passcode.startDate).format(" HH:mm")
      var final = moment(passcode.endDate).format(" HH:mm")
      respuesta = moment(passcode.sendDate).format("YYYY/MM/DD HH:mm").concat(", ", inicio, " - ", final, " Diaria")
    }
    if (passcode.keyboardPwdType === 7) {
      var inicio = moment(passcode.startDate).format(" HH:mm")
      var final = moment(passcode.endDate).format(" HH:mm")
      respuesta = moment(passcode.sendDate).format("YYYY/MM/DD HH:mm").concat(", ", inicio, " - ", final, " Dia de Trabajo")
    }
    if (passcode.keyboardPwdType === 8) {
      var inicio = moment(passcode.startDate).format(" HH:mm")
      var final = moment(passcode.endDate).format(" HH:mm")
      respuesta = moment(passcode.sendDate).format("YYYY/MM/DD HH:mm").concat(", ", inicio, " - ", final, " Lunes")
    }
    if (passcode.keyboardPwdType === 9) {
      var inicio = moment(passcode.startDate).format(" HH:mm")
      var final = moment(passcode.endDate).format(" HH:mm")
      respuesta = moment(passcode.sendDate).format("YYYY/MM/DD HH:mm").concat(", ", inicio, " - ", final, " Martes")
    }
    if (passcode.keyboardPwdType === 10) {
      var inicio = moment(passcode.startDate).format(" HH:mm")
      var final = moment(passcode.endDate).format(" HH:mm")
      respuesta = moment(passcode.sendDate).format("YYYY/MM/DD HH:mm").concat(", ", inicio, " - ", final, " Miercoles")
    }
    if (passcode.keyboardPwdType === 11) {
      var inicio = moment(passcode.startDate).format(" HH:mm")
      var final = moment(passcode.endDate).format(" HH:mm")
      respuesta = moment(passcode.sendDate).format("YYYY/MM/DD HH:mm").concat(", ", inicio, " - ", final, " Jueves")
    }
    if (passcode.keyboardPwdType === 12) {
      var inicio = moment(passcode.startDate).format(" HH:mm")
      var final = moment(passcode.endDate).format(" HH:mm")
      respuesta = moment(passcode.sendDate).format("YYYY/MM/DD HH:mm").concat(", ", inicio, " - ", final, " Viernes")
    }
    if (passcode.keyboardPwdType === 13) {
      var inicio = moment(passcode.startDate).format(" HH:mm")
      var final = moment(passcode.endDate).format(" HH:mm")
      respuesta = moment(passcode.sendDate).format("YYYY/MM/DD HH:mm").concat(", ", inicio, " - ", final, " Sabado")
    }
    if (passcode.keyboardPwdType === 14) {
      var inicio = moment(passcode.startDate).format(" HH:mm")
      var final = moment(passcode.endDate).format(" HH:mm")
      respuesta = moment(passcode.sendDate).format("YYYY/MM/DD HH:mm").concat(", ", inicio, " - ", final, " Domingo")
    }
    return respuesta;
  }
  periodoValidezFingerprint(fingerprint: Fingerprint) {
    if (fingerprint.fingerprintType === 1) {
      return this.periodoValidez(fingerprint.startDate, fingerprint.endDate)
    }
    else {
      var HoraInicio: string;
      var HoraFinal: string;
      var minutosInicio;
      var minutosFinal;
      var fechaInicio = moment(fingerprint.startDate)
      var fechaFinal = moment(fingerprint.endDate)
      var dia: string;
      var retorno = fechaInicio.format("YYYY/MM/DD").toString().concat(' - ').concat(fechaFinal.format("YYYY/MM/DD").toString().concat("\n"));
      for (let index = 0; index < fingerprint.cyclicConfig.length; index++) {
        if (fingerprint.cyclicConfig[index].weekDay === 1) {
          dia = ', Lunes'
          retorno = retorno.concat(dia);
          minutosInicio = fingerprint.cyclicConfig[index].startTime
          minutosFinal = fingerprint.cyclicConfig[index].endTime
        }
        if (fingerprint.cyclicConfig[index].weekDay === 2) {
          dia = ', Martes'
          retorno = retorno.concat(dia);
          minutosInicio = fingerprint.cyclicConfig[index].startTime
          minutosFinal = fingerprint.cyclicConfig[index].endTime
        }
        if (fingerprint.cyclicConfig[index].weekDay === 3) {
          dia = ', Miercoles'
          retorno = retorno.concat(dia);
          minutosInicio = fingerprint.cyclicConfig[index].startTime
          minutosFinal = fingerprint.cyclicConfig[index].endTime
        }
        if (fingerprint.cyclicConfig[index].weekDay === 4) {
          dia = ', Jueves'
          retorno = retorno.concat(dia);
          minutosInicio = fingerprint.cyclicConfig[index].startTime
          minutosFinal = fingerprint.cyclicConfig[index].endTime
        }
        if (fingerprint.cyclicConfig[index].weekDay === 5) {
          dia = ', Viernes'
          retorno = retorno.concat(dia);
          minutosInicio = fingerprint.cyclicConfig[index].startTime
          minutosFinal = fingerprint.cyclicConfig[index].endTime
        }
        if (fingerprint.cyclicConfig[index].weekDay === 6) {
          dia = ', Sabado'
          retorno = retorno.concat(dia);
          minutosInicio = fingerprint.cyclicConfig[index].startTime
          minutosFinal = fingerprint.cyclicConfig[index].endTime
        }
        if (fingerprint.cyclicConfig[index].weekDay === 7) {
          dia = ', Domingo'
          retorno = retorno.concat(dia);
          minutosInicio = fingerprint.cyclicConfig[index].startTime
          minutosFinal = fingerprint.cyclicConfig[index].endTime
        }
      }
      //SE AGREGA EL TIEMPO DE CICLO A LA FECHA
      fechaInicio.add(minutosInicio, 'minutes')
      fechaFinal.add(minutosFinal, 'minutes')
      fechaFinal.add(1, 'minutes');//POR ALGUNA RAZON LE FALTA UN MINUTO A LA HORA FINAL TALVEZ REDONDEA MAL
      //AGREGAR UN 0 AL INICIO PARA QUE QUEDE 09:00 EN VEZ DE 9:00
      if (fechaInicio.hours() < 10) {
        var cero = "0";
        cero = cero.concat(fechaInicio.hours().toString())
        HoraInicio = cero
      } else { HoraInicio = fechaInicio.hours().toString() }
      //SE HACE LO MISMO CON MINUTOS Y SE JUNTAN PARA QUE QUEDE 09:08 EN VEZ DE 09:8
      if (fechaInicio.minutes() < 10) {
        var cero = "0";
        cero = cero.concat(fechaInicio.minutes().toString())
        HoraInicio = HoraInicio.concat(":").concat(cero);
      } else { HoraInicio = HoraInicio.concat(":").concat(fechaInicio.minutes().toString()) }
      //HACER LO MISMO CON HORA FINAL
      if (fechaFinal.hours() < 10) {
        var cero = "0";
        cero = cero.concat(fechaFinal.hours().toString())
        HoraFinal = cero
      } else { HoraFinal = fechaFinal.hours().toString() }
      if (fechaFinal.minutes() < 10) {
        var cero = "0";
        cero = cero.concat(fechaFinal.minutes().toString())
        HoraFinal = HoraFinal.concat(":").concat(cero);
      } else { HoraFinal = HoraFinal.concat(":").concat(fechaFinal.minutes().toString()) }
      retorno = retorno.concat("\n").concat(HoraInicio).concat(" ~ ").concat(HoraFinal)
      return retorno
    }
  }
  consultarEstado(end: number) {
    if (end === 0) { return this.sanitizer.bypassSecurityTrustHtml('<span style="color: green;">Valido</span>'); }
    else {
      var ahora = moment()
      var final = moment(end)
      if (moment(final).isBefore(ahora)) {
        return this.sanitizer.bypassSecurityTrustHtml('<span style="color: red;">Caducado</span>');
      }
      else { return this.sanitizer.bypassSecurityTrustHtml('<span style="color: green;">Valido</span>'); }
    }
  }
  consultarEstadoEkey(ekey: Ekey) {
    if (ekey.keyStatus === "110402") {//PENDING
      return this.sanitizer.bypassSecurityTrustHtml('<span style="color: gray;">Pendiente</span>');
    }
    if (ekey.keyStatus === "110405") {//FREEZED
      return this.sanitizer.bypassSecurityTrustHtml('<span style="color: blue;">Congelada</span>');
    }
    else {//NORMAL
      if (!ekey.endDay) {//MIENTRAS NO SEA SOLICITANTE 
        if (this.Number(ekey.endDate) === 0) {//PERMANENTE
          return this.sanitizer.bypassSecurityTrustHtml('<span style="color: green;">Valido</span>');
        }
        if (this.Number(ekey.endDate) === 1) {//UNA VEZ
          if (moment(ekey.startDate).add(1, "hour").isAfter(moment())) {
            return this.sanitizer.bypassSecurityTrustHtml('<span style="color: green;">Valido</span>');
          } else {
            return this.sanitizer.bypassSecurityTrustHtml('<span style="color: red;">Invalido</span>');
          }
        }
        else {//PERIODICA
          return this.consultarEstado(this.Number(ekey.endDate))
        }
      }
      else {//SOLICITANTE
        let fecha = moment(ekey.endDay).format("YYYY-MM-DD");
        let tiempo = moment(ekey.endDate).format("YYYY-MM-DD/HH:mm")
        tiempo = tiempo.split("/")[1];
        let end = fecha.concat(" ", tiempo);
        return this.consultarEstado(moment(end).valueOf())
      }
    }
  }
  consultarEstadoPasscode(passcode: Passcode) {
    if (passcode.keyboardPwdType === 1) {
      let seisHoras = moment(passcode.startDate).add(6, 'hours')
      let ahora = moment()
      if (ahora.isAfter(seisHoras)) {
        return 'Caducado'
      } else {
        return 'Valido'
      }
    }
    if (passcode.keyboardPwdType === 2) {
      return 'Valido'
    }
    if (passcode.keyboardPwdType === 3) {
      let ahora = moment()
      let inicio = moment(passcode.startDate)
      let final = moment(passcode.endDate)
      if (ahora.isBefore(inicio) || ahora.isAfter(final) || final.isBefore(inicio)) {
        return 'Inactivo'
      } else {
        return 'Valido'
      }
    }
    if (passcode.keyboardPwdType === 4) {
      return 'Valido'
    }
    else {
      return 'Valido'
    }
  }
  consultarSuccess(success: number) {
    if (success == 0) { return 'Fallido' }
    else { return 'Exito' }
  }
  consultarMetodo(tipo: number, operador: string) {
    switch (tipo) {
      case 1:
        return 'Abrir con la aplicación';
      case 4:
        return 'Abrir con código de acceso';
      case 5:
        return 'modify a passcode on the lock';
      case 6:
        return 'delete a passcode on the lock';
      case 7:
        var retorno = 'Abrir con código de acceso—'.concat(operador)
        return retorno;
      case 8:
        return 'clear passcodes from the lock';
      case 9:
        return 'passcode be squeezed out';
      case 10:
        return 'unlock with passcode with delete function, passcode before it will all be deleted';
      case 11:
        var retorno = 'Abrir con código de acceso—'.concat(operador)
        return retorno;
      case 12:
        var retorno = 'Abrir con código de acceso—'.concat(operador)
        return retorno;
      case 13:
        var retorno = 'Abrir con código de acceso—'.concat(operador)
        return retorno;
      case 14:
        return 'lock power on';
      case 15:
        return 'add card success';
      case 16:
        return 'clear cards';
      case 17:
        return 'Abrir con Tarjeta RF';
      case 18:
        return 'delete an card';
      case 19:
        return 'unlock by wrist strap success';
      case 20:
        return 'Abrir con huella digital';
      case 21:
        return 'add fingerprint';
      case 22:
        return 'Abrir con huella digital';
      case 23:
        return 'delete a fingerprint';
      case 24:
        return 'clear fingerprints';
      case 25:
        return 'Abrir con Tarjeta RF';
      case 26:
        return 'Cerrar con Aplicación';
      case 27:
        return 'unlock by Mechanical key';
      case 28:
        return 'Abrir de forma remota';
      case 29:
        return 'apply some force on the Lock';
      case 30:
        return 'Door sensor closed';
      case 31:
        return 'Door sensor open';
      case 32:
        return 'open from inside';
      case 33:
        return 'lock by fingerprint';
      case 34:
        return 'lock by passcode';
      case 35:
        return 'lock by card';
      case 36:
        return 'lock by Mechanical key';
      case 37:
        return 'Remote Control';
      case 38:
        return 'unlock by passcode failed—The door has been double locked';
      case 39:
        return 'unlock by IC card failed—The door has been double locked';
      case 40:
        return 'Abrir con huella digital';
      case 41:
        return 'unlock by app failed—The door has been double locked';
      case 42:
        return 'received new local mail';
      case 43:
        return 'received new other cities\' mail';
      case 44:
        return 'Tamper alert';
      case 45:
        return 'Se cierra automáticamente al final del Modo de Paso';
      case 46:
        return 'unlock by unlock key';
      case 47:
        return 'lock by lock key';
      case 48:
        return '¡Detectados intentos de acceso no autorizados!';
      case 49:
        return 'unlock by hotel card';
      case 50:
        return 'Unlocked due to the high temperature';
      case 51:
        return 'unlock by card failed—card in blacklist';
      case 52:
        return 'Dead lock with APP';
      case 53:
        return 'Dead lock with passcode';
      case 54:
        return 'The car left (for parking lock)';
      case 55:
        return 'unlock with key fob';
      case 57:
        return 'Unlock with QR code success';
      case 58:
        return 'Unlock with QR code failed, it\'s expired';
      case 59:
        return 'Double locked';
      case 60:
        return 'Cancel double lock';
      case 61:
        return 'Lock with QR code success';
      case 62:
        return 'Lock with QR code failed, the lock is double locked';
      case 63:
        return 'Auto unlock at passage mode';
      case 64:
        return 'Door unclosed alarm';
      case 65:
        return 'Failed to unlock';
      case 66:
        return 'Failed to lock';
      case 67:
        return 'Face unlock success';
      case 68:
        return 'Face unlock failed - door locked from inside';
      case 69:
        return 'Lock with face';
      case 70:
        return 'Face registration success';
      case 71:
        return 'Face unlock failed - expired or ineffective';
      case 72:
        return 'Delete face success';
      case 73:
        return 'Clear face success';
      case 74:
        return 'IC card unlock failed - CPU secure information error';
      case 75:
        return 'App authorized button unlock success';
      case 76:
        return 'Gateway authorized button unlock success';
      case 77:
        return 'Dual authentication Bluetooth unlock verification success, waiting for second user';
      case 78:
        return 'Dual authentication password unlock verification success, waiting for second user';
      case 79:
        return 'Dual authentication fingerprint unlock verification success, waiting for second user';
      case 80:
        return 'Dual authentication IC card unlock verification success, waiting for second user';
      case 81:
        return 'Dual authentication face card unlock verification success, waiting for second user';
      case 82:
        return 'Dual authentication wireless key unlock verification success, waiting for second user';
      case 83:
        return 'Dual authentication palm vein unlock verification success, waiting for second user';
      case 84:
        return 'Palm vein unlock success';
      case 85:
        return 'Palm vein unlock success';
      case 86:
        return 'Lock with palm vein';
      case 87:
        return 'Register palm vein success';
      case 88:
        return 'Palm vein unlock failed - expired or ineffective';
      default:
        return 'Unknown type';
    }
  }
  async Unlock() {
    if (this.gateway === '1') {
      this.isLoading = true;
      try {
        let response = await lastValueFrom(this.gatewayService.unlock(this.token, this.lockId)) as operationResponse;
        if (response.errcode === 0) {
          console.log("Cerradura desbloqueada")
        } else {
          console.log(response)
        }
      } catch (error) {
        console.error("Error unlocking:", error);
      } finally {
        this.isLoading = false;
      }
    } else {
      this.popupService.needGateway = true;
      console.log("Necesita estar conectado a un gateway para usar esta función")
    }
  }
  async Lock() {
    if (this.gateway === '1') {
      this.isLoading = true;
      try {
        let response = await lastValueFrom(this.gatewayService.lock(this.token, this.lockId)) as operationResponse;
        if (response.errcode === 0) {
          console.log("Cerradura bloqueada")
        } else {
          console.log(response)
        }
      } catch (error) {
        console.error("Error locking:", error);
      } finally {
        this.isLoading = false;
      }
    } else {
      this.popupService.needGateway = true;
      console.log("Necesita estar conectado a un gateway para usar esta función")
    }
  }
  //SETTINGS
  Esencial() {
    this.popupService.detalles = this.lockDetails;
    this.popupService.esencial = true;
  }
  TransferirLock() {
    this.lockService.token = this.token;
    this.lockService.lockID = this.lockId;
    this.router.navigate(["users", this.username, "lock", this.lockId, "transferLock"]);
  }
  async Gateway() {
    //Traer Gateways
    await this.fetchGatewaysLock()
    await this.fetchGatewaysAccount()
    this.popupService.gateway = true;
  }
  async HoraDispositivo() {
    if (this.gateway === '1') {
      this.gatewayService.token = this.token;
      this.gatewayService.lockID = this.lockId;
      this.isLoading = true;
      try {
        let response = await lastValueFrom(this.gatewayService.getLockTime(this.token, this.lockId)) as GetLockTimeResponse;
        if (response.date) {
          this.popupService.currentTime = response.date;
        } else {
          console.log(response)
        }
      } catch (error) {
        console.error("Error while fetching lock's time:", error)
      } finally {
        this.isLoading = false; // Set isLoading to false when data fetching is complete
      }
      this.popupService.mostrarHora = true;
    } else {
      this.popupService.needGateway = true;
    }
  }
  async PassageMode() {
    if (this.gateway === '1') {
      this.passageModeService.token = this.token
      this.passageModeService.lockID = this.lockId;
      //TRAER CONFIGURACION DE MODO DE PASO
      this.isLoading = true;
      try {
        let response = await lastValueFrom(this.passageModeService.getPassageModeConfig(this.token, this.lockId)) as PassageMode;
        if (response.passageMode) {
          this.passageModeService.passageModeConfig = response;
          this.router.navigate(["users", this.username, "lock", this.lockId, "passageMode"]);
        } else {
          console.log(response)
        }
      } catch (error) {
        console.error("Error while fetching passage mode configurations:", error)
      } finally {
        this.isLoading = false; // Set isLoading to false when data fetching is complete
      }
    } else {
      this.popupService.needGateway = true;
      console.log("Necesita estar conectado a un gateway para usar esta función")
    }
  }
  AutoLock() {
    if (this.gateway === '1') {
      this.popupService.detalles = this.lockDetails;
      this.popupService.token = this.token;
      this.popupService.lockID = this.lockId;
      this.popupService.cerradoAutomatico = true;
    } else {
      this.popupService.needGateway = true;
      console.log("Necesita estar conectado a un gateway para usar esta función")
    }
  }
  //FUNCIONES EKEY
  congelar(ekeyID: number, user: string) {
    this.popupService.token = this.token;
    this.popupService.lockID = this.lockId;
    this.popupService.elementID = ekeyID;
    this.popupService.elementType = user;
    this.popupService.congelar = true;
  }
  descongelar(ekeyID: number, user: string) {
    this.popupService.token = this.token;
    this.popupService.lockID = this.lockId;
    this.popupService.elementID = ekeyID;
    this.popupService.elementType = user;
    this.popupService.descongelar = true;
  }
  borrarEkey(ekeyID: number, ekeyUsername: string) {
    this.popupService.token = this.token;
    this.popupService.lockID = this.lockId;
    this.popupService.elementType = 'ekey';
    this.popupService.elementID = ekeyID;
    this.popupService.ekeyUsername = ekeyUsername;
    this.popupService.delete = true;
  }
  cambiarNombreEkey(ekeyID: number) {
    this.popupService.token = this.token;
    this.popupService.lockID = this.lockId;
    this.popupService.elementType = 'ekey';
    this.popupService.elementID = ekeyID;
    this.popupService.cambiarNombre = true;
  }
  cambiarPeriodoEkey(ekeyID: number) {
    this.popupService.token = this.token;
    this.popupService.lockID = this.lockId;
    this.popupService.elementType = 'ekey';
    this.popupService.elementID = ekeyID;
    this.popupService.cambiarPeriodo = true;
  }
  crearEkey() {
    this.ekeyService.token = this.token;
    this.ekeyService.username = this.username;
    this.ekeyService.lockID = this.lockId;
    this.ekeyService.endDateUser = this.endDateDeUser;
    this.router.navigate(["users", this.username, "lock", this.lockId, "ekey"]);
  }
  Autorizar(ekeyID: number, user: string) {
    this.popupService.token = this.token;
    this.popupService.lockID = this.lockId;
    this.popupService.elementID = ekeyID;
    this.popupService.elementType = user;
    this.popupService.autorizar = true;
  }
  Desautorizar(ekeyID: number, user: string) {
    this.popupService.token = this.token;
    this.popupService.lockID = this.lockId;
    this.popupService.elementID = ekeyID;
    this.popupService.elementType = user;
    this.popupService.desautorizar = true;
  }
  AutorizarFalso(ekeyUsername: string) {
    this.popupService.elementType = ekeyUsername;;
    this.popupService.lockID = this.lockId;
    this.popupService.autorizarFalso = true;
  }
  DesautorizarFalso(ekeyUsername: string) {
    this.popupService.elementType = ekeyUsername;
    this.popupService.lockID = this.lockId;
    this.popupService.desautorizarFalso = true;
  }
  getVariable(nombre: string) {
    return sessionStorage.getItem(nombre);
  }
  //FUNCIONES PASSCODE
  crearPasscode() {
    this.passcodeService.lockAlias = this.Alias;
    this.passcodeService.token = this.token;
    this.passcodeService.username = this.username;
    this.passcodeService.lockID = this.lockId;
    this.passcodeService.endDateUser = this.endDateDeUser;
    this.passcodeService.gateway = Number(this.gateway)
    this.passcodeService.featureValue = this.featureValue;
    this.router.navigate(["users", this.username, "lock", this.lockId, "passcode"]);
  }
  cambiarPasscode(passcode: Passcode) {
    if (this.gateway === '1') {
      this.popupService.token = this.token;
      this.popupService.lockID = this.lockId;
      this.popupService.elementType = 'passcode';
      this.popupService.elementID = passcode.keyboardPwdId;
      this.popupService.passcode = passcode;
      this.popupService.editarPasscode = true;
    } else {
      this.popupService.needGateway = true;
      console.log("Necesita estar conectado a un gateway para usar esta función")
    }
  }
  borrarPasscode(passcodeID: number) {
    if (this.gateway === '1') {
      this.popupService.token = this.token;
      this.popupService.lockID = this.lockId;
      this.popupService.elementType = 'passcode';
      this.popupService.elementID = passcodeID;
      this.popupService.delete = true;
    } else {
      this.popupService.needGateway = true;
      console.log("Necesita estar conectado a un gateway para usar esta función")
    }
  }
  crearPasscodeSimple() {
    this.passcodeService.token = this.token;
    this.passcodeService.lockID = this.lockId;
    this.passcodeService.passcodesimple = true;
    this.router.navigate(["users", this.username, "lock", this.lockId, "passcode"]);
  }
  compartirPasscode(passcode: Passcode) {
    this.popupService.passcode = passcode;
    this.popupService.sharePasscode = true;
  }
  //FUNCIONES CARD
  borrarCard(cardID: number) {
    if (this.gateway === '1') {
      this.popupService.token = this.token;
      this.popupService.lockID = this.lockId;
      this.popupService.elementType = 'card';
      this.popupService.elementID = cardID;
      this.popupService.delete = true;
    } else {
      this.popupService.needGateway = true;
      console.log("Necesita estar conectado a un gateway para usar esta función")
    }
  }
  cambiarNombreCard(cardID: number) {
    this.popupService.token = this.token;
    this.popupService.lockID = this.lockId;
    this.popupService.elementType = 'card';
    this.popupService.elementID = cardID;
    this.popupService.cambiarNombre = true;
  }
  cambiarPeriodoCard(cardID: number) {
    if (this.gateway === '1') {
      this.popupService.token = this.token;
      this.popupService.lockID = this.lockId;
      this.popupService.elementType = 'card';
      this.popupService.elementID = cardID;
      this.popupService.cambiarPeriodo = true;
    } else {
      this.popupService.needGateway = true;
      console.log("Necesita estar conectado a un gateway para usar esta función")
    }
  }
  //FUNCIONES FINGERPRINT
  borrarFingerprint(fingerID: number) {
    if (this.gateway === '1') {
      this.popupService.token = this.token;
      this.popupService.lockID = this.lockId;
      this.popupService.elementType = 'fingerprint';
      this.popupService.elementID = fingerID;
      this.popupService.delete = true;
    } else {
      this.popupService.needGateway = true;
      console.log("Necesita estar conectado a un gateway para usar esta función")
    }
  }
  cambiarNombreFingerprint(fingerID: number) {
    this.popupService.token = this.token;
    this.popupService.lockID = this.lockId;
    this.popupService.elementType = 'fingerprint';
    this.popupService.elementID = fingerID;
    this.popupService.cambiarNombre = true;
  }
  cambiarPeriodoFingerprint(fingerID: number) {
    this.popupService.token = this.token;
    this.popupService.lockID = this.lockId;
    this.popupService.elementType = 'fingerprint';
    this.popupService.elementID = fingerID;
    this.popupService.cambiarPeriodo = true;
  }
}