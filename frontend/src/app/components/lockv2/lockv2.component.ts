import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { lastValueFrom } from 'rxjs';
import { faBatteryFull, faWifi, faGear, faDoorOpen, faPlus } from '@fortawesome/free-solid-svg-icons'
import { MatTableDataSource } from '@angular/material/table';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { LockServiceService } from '../../services/lock-service.service';
import { EkeyServiceService } from '../../services/ekey-service.service';
import { PasscodeServiceService } from '../../services/passcode-service.service';
import { CardServiceService } from '../../services/card-service.service';
import { FingerprintServiceService } from '../../services/fingerprint-service.service';
import { RecordServiceService } from '../../services/record-service.service';
import { PopUpService } from '../../services/pop-up.service';
import { GatewayService } from '../../services/gateway.service';
import { PassageModeService } from '../../services/passage-mode.service';
import { GroupService } from '../../services/group.service';
import { UserServiceService } from '../../services/user-service.service';
import { RecordResponse, EkeyResponse, PasscodeResponse, CardResponse, FingerprintResponse, GatewayAccountResponse, operationResponse, LockListResponse, GroupResponse } from '../../Interfaces/API_responses';
import { Ekey, Passcode, Card, Fingerprint, Record } from '../../Interfaces/Elements';
import { Group } from '../../Interfaces/Group';
import { PassageMode } from '../../Interfaces/PassageMode';
import { LockData, LockDetails } from '../../Interfaces/Lock';
import { DarkModeService } from '../../services/dark-mode.service';

@Component({
  selector: 'app-lock',
  templateUrl: './lockv2.component.html',
  styleUrls: ['./lockv2.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class Lockv2Component implements OnInit {


  faBatteryFull = faBatteryFull
  faWifi = faWifi
  faGear = faGear
  faDoorOpen = faDoorOpen
  faPlus = faPlus
  userID = sessionStorage.getItem('user') ?? ''
  lockId: number = Number(sessionStorage.getItem('lockID') ?? '')
  userType = sessionStorage.getItem('userType') ?? '';
  keyRight = sessionStorage.getItem('keyRight') ?? '';
  startDateDeUser = sessionStorage.getItem('startDate') ?? '';
  endDateDeUser = sessionStorage.getItem('endDate') ?? '';
  Alias = sessionStorage.getItem('lockAlias') ?? '';
  Bateria = sessionStorage.getItem('lockBatery') ?? '';
  gateway = sessionStorage.getItem('lockGateway') ?? '';
  featureValue = sessionStorage.getItem('lockFeature') ?? '';
  lockGroup = sessionStorage.getItem('lockGroup') ?? '';
  pageLoaded = false;
  isLoading: boolean = false;
  lockDetails: LockDetails;
  textoBusqueda: string = '';
  ekeys: Ekey[] = [];
  ekeys_filtradas: Ekey[] = [];
  passcodes: Passcode[] = [];
  passcodes_filtradas: Passcode[] = [];
  fingerprints: Fingerprint[] = [];
  fingerprints_filtradas: Fingerprint[] = [];
  cards: Card[] = [];
  cards_filtradas: Card[] = [];
  records: Record[] = []
  records_filtradas: Record[] = [];
  allRecords: Record[] = [];
  allLocks: LockData[] = [];
  locks: LockData[] = [];
  locksWithoutGroup: LockData[] = [];
  groups: Group[] = []
  selectedTabIndex = 0;
  recordsDataSource: MatTableDataSource<Record>;
  displayedColumnsEkey: string[] = ['Nombre', 'Destinatario', 'Rol', 'Fecha', 'Periodo_validez', 'Valido', 'Botones']
  displayedColumnsPasscode: string[] = ['Nombre', 'Contrasena', 'Responsable', 'Fecha', 'Periodo_validez', 'Valido', 'Botones']
  displayedColumnsCard: string[] = ['Nombre', 'Numero_tarjeta', 'Responsable', 'Fecha', 'Periodo_validez', 'Valido', 'Botones']
  displayedColumnsFingerprint: string[] = ['Nombre', 'Responsable', 'Fecha', 'Periodo_validez', 'Valido', 'Botones']
  displayedColumnsRecord: string[] = ['Operador', 'Metodo_Apertura', 'Horario_Apertura', 'Estado']
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
  recordCurrentPage: number = 1;
  recordTotalPages: number;
  recordStartDate: Date;
  startDate: number;
  recordEndDate: Date;
  endDate: number;
  selectedType = '';
  tabTypes: string[] = ['ekeys'];

  constructor(
    private router: Router,
    private sanitizer: DomSanitizer,
    public ekeyService: EkeyServiceService,
    public passcodeService: PasscodeServiceService,
    public cardService: CardServiceService,
    public fingerprintService: FingerprintServiceService,
    public recordService: RecordServiceService,
    private gatewayService: GatewayService,
    private passageModeService: PassageModeService,
    private groupService: GroupService,
    public popupService: PopUpService,
    public lockService: LockServiceService,
    public userService: UserServiceService,
    public DarkModeService: DarkModeService
  ) { }


  async ngOnInit() {
    await this.ekeyService.fetchEkeys(this.lockId);
    for (const feature of this.featureList) {
      this.lockService.checkFeature(this.featureValue, feature.bit);
    }
    if (this.lockService.checkFeature(this.featureValue, 0)) this.tabTypes.push('passcodes');
    if (this.lockService.checkFeature(this.featureValue, 1)) this.tabTypes.push('cards');
    if (this.lockService.checkFeature(this.featureValue, 2)) this.tabTypes.push('fingerprints');
    this.tabTypes.push('records');
    //let lockResponse = await lastValueFrom(this.lockService.getLockListAccount(this.userID)) as LockListResponse;
    //console.log(lockResponse)
    //this.lockService.adminLocks = lockResponse.list;
    //let gatewayResponse = await lastValueFrom(this.gatewayService.getGatewaysAccount(this.userID, 1, 100)) as GatewayAccountResponse;
    //console.log(gatewayResponse)
    //this.gatewayService.gateways = gatewayResponse.list;
    this.pageLoaded = true;
  }
  async getAllLocks() {
    this.isLoading = true;
    try {
      let pageNo = 1;
      const pageSize = 100;
      while (true) {
        const locksResponse = await lastValueFrom(this.ekeyService.getEkeysofAccount(this.userID, pageNo, pageSize, 0));
        const locksTypedResponse = locksResponse as LockListResponse;
        if (locksTypedResponse?.list) {
          this.allLocks.push(...locksTypedResponse.list);
          this.locksWithoutGroup.push(...locksTypedResponse.list.filter(lock => !lock.groupId));
          if (locksTypedResponse.pages > pageNo) {
            pageNo++;
          } else {
            break;
          }
        } else if (locksTypedResponse.errcode === 10003) {
          sessionStorage.clear();
          break;
        } else {
          break;
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
      const response = await lastValueFrom(this.groupService.getGroupofAccount(this.userID));
      const typedResponse = response as GroupResponse;
      if (typedResponse?.list) {
        this.groups = typedResponse.list;
        for (const group of this.groups) {
          group.lockCount = await this.calculateLockCountForGroup(group);
        }
      } else if (typedResponse.errcode === 10003) {
        sessionStorage.clear();
      } else {
        console.log("Groups not yet available");
      }
    } catch (error) {
      console.error("Error while fetching groups:", error);
    } finally {
      this.isLoading = false;
    }
    this.groupService.groups = this.groups;
  }
  async calculateLockCountForGroup(group: Group): Promise<number> {
    let lockCount = 0;
    let pageNo = 1;
    const pageSize = 100;
    group.locks = [];
    while (true) {
      const locksResponse = await lastValueFrom(this.ekeyService.getEkeysofAccount(this.userID, pageNo, pageSize, group.groupId));
      const locksTypedResponse = locksResponse as LockListResponse;
      if (locksTypedResponse?.list && locksTypedResponse.list.length > 0) {
        lockCount += locksTypedResponse.list.length;
        group.locks.push(...locksTypedResponse.list);
        if (locksTypedResponse.pages > pageNo) {
          pageNo++;
        } else {
          break;
        }
      } else {
        break;
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
      this.isLoading = false;
    }
  }
  async fetchLocksPage(pageNo: number, groupId?: number) {
    this.locks = [];
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.ekeyService.getEkeysofAccount(this.userID, pageNo, 100, groupId));
      const typedResponse = response as LockListResponse;
      if (typedResponse?.list) {
        this.locks.push(...typedResponse.list);
        if (typedResponse.pages > pageNo) {
          await this.fetchLocksPage(pageNo + 1, groupId);
        }
      } else if (typedResponse.errcode === 10003) {
        sessionStorage.clear();
      } else {
        console.log("Locks not yet available")
      }
    } catch (error) {
      console.error("Error while fetching locks page:", error)
    } finally {
      this.isLoading = false;
    }
  }
  async fetchRecords() {
    this.records = [];
    this.isLoading = true;
    try {
      await this.fetchRecordsPage(1);
    } catch (error) {
      console.error("Error while fetching records:", error);
    } finally {
      this.recordsDataSource = new MatTableDataSource(this.records);
      console.log(this.records)
      this.isLoading = false;
    }
  }
  async fetchRecordsPage(pageNo: number) {
    this.isLoading = true;
    try {
      if (this.recordStartDate instanceof Date) {
        this.startDate = this.recordStartDate.getTime(); // Convert to timestamp
      }
      if (this.recordEndDate instanceof Date) {
        this.endDate = this.recordEndDate.getTime(); // Convert to timestamp
      }
      const response = await lastValueFrom(this.recordService.getRecords(this.userID, this.lockId, pageNo, 20, this.startDate, this.endDate, this.selectedType))
      const typedResponse = response as RecordResponse;
      if (typedResponse?.list) {
        this.records = [];
        this.records.push(...typedResponse.list);
        this.recordCurrentPage = pageNo;
        this.recordTotalPages = typedResponse.pages;
        this.recordsDataSource = new MatTableDataSource(this.records);
        /*if (typedResponse.pages > pageNo) {
          await this.fetchRecordsPage(pageNo + 1);
        }*/
      } else if (typedResponse.errcode === 10003) {
        sessionStorage.clear();
      } else {
        console.log("Records not yet available");
      }
    } catch (error) {
      console.error("Error while fetching records page:", error);
    } finally {
      this.isLoading = false;
    }
  }
  async fetchAllRecords(pageNo: number) {
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.recordService.getRecords(this.userID, this.lockId, pageNo, 100)) as RecordResponse
      if (response?.list) {
        this.allRecords.push(...response.list);
        if (response.pages > pageNo) {
          await this.fetchAllRecords(pageNo + 1);
        }
      } else if (response.errcode === 10003) {
        sessionStorage.clear();
      } else {
        console.log("Records not yet available");
      }
    } catch (error) {
      console.error("Error while fetching records page:", error);
    } finally {
      this.isLoading = false;
    }
  }
  async fetchLockDetails() {
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.lockService.getLockDetails(this.userID, this.lockId)) as LockDetails
      console.log(response)
      if (response.lockId) {
        this.lockDetails = response;
      } else if (response.errcode === 10003) {
        sessionStorage.clear();
      } else {
        console.log(response)
      }
    } catch (error) {
      console.error("Error while fetching details of a lock:", error)
    } finally {
      this.isLoading = false;
    }
  }
  updatePasscodeUsage() {
    for (const passcode of this.passcodes) {
      const usedRecord = this.records.find(record => record.keyboardPwd === passcode.keyboardPwd && record.success === 1);
      if (usedRecord) {
        passcode.hasBeenUsed = true
      }
    }
  }
  async onTabChanged(event: MatTabChangeEvent): Promise<void> {
    this.isLoading = true;
    this.selectedTabIndex = event.index;
    const selectedTab = this.tabTypes[event.index]
    switch (selectedTab) {
      case 'ekeys':
        this.textoBusqueda = '';
        await this.ekeyService.fetchEkeys(this.lockId);
        this.isLoading = false;
        break;
      case 'passcodes':
        this.textoBusqueda = '';
        await this.passcodeService.fetchPasscodes(this.lockId);
        this.isLoading = false;
        break;
      case 'cards':
        this.textoBusqueda = '';
        await this.cardService.fetchCards(this.lockId);
        this.isLoading = false;
        break;
      case 'fingerprints':
        this.textoBusqueda = '';
        await this.fingerprintService.fetchFingerprints(this.lockId);
        console.log(this.fingerprintService.fingerprints)
        this.isLoading = false;
        break;
      case 'records':
        this.textoBusqueda = '';
        this.recordCurrentPage = 1;
        await this.fetchRecords();
        this.isLoading = false;
        break;
    }
  }
  Number(palabra: string) {
    return Number(palabra)
  }
  //SETTINGS
  async editName() {
    this.popupService.userID = this.userID;
    this.popupService.lockID = this.lockId;
    this.popupService.elementType = 'lock';
    this.popupService.cambiarNombre = true;
  }
  async PassageMode() {
    if (this.gateway === '1') {
      this.passageModeService.userID = this.userID
      this.passageModeService.lockID = this.lockId;
      //TRAER CONFIGURACION DE MODO DE PASO
      this.isLoading = true;
      try {
        let response = await lastValueFrom(this.passageModeService.getPassageModeConfig(this.userID, this.lockId)) as PassageMode;
        console.log(response)
        if (response.passageMode) {
          this.passageModeService.passageModeConfig = response;
          this.popupService.passageMode = true;
          //this.router.navigate(["users", this.username, "lock", this.lockId, "passageMode"]);
        } else if (response.errcode === 10003) {
          sessionStorage.clear();
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
  async Unlock() {
    if (this.gateway === '1') {
      this.isLoading = true;
      try {
        let response = await lastValueFrom(this.gatewayService.unlock(this.userID, this.lockId)) as operationResponse;
        if (response.errcode === 0) {
          console.log("Cerradura desbloqueada")
        } else if (response.errcode === 10003) {
          sessionStorage.clear();
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
  toTemporalPasscode() {
    this.popupService.userID = this.userID;
    this.popupService.lockID = this.lockId;
    this.popupService.endDateUser = this.endDateDeUser;
    this.popupService.lock_alias = this.Alias;
    this.popupService.temporalPasscode = true;
  }
  async esencial() {
    this.isLoading = true;
    try {
      await this.fetchLockDetails();
    } catch (error) {
      console.error("Error while fetching passage mode configurations:", error)
    } finally {
      this.isLoading = false; // Set isLoading to false when data fetching is complete
      this.popupService.detalles = this.lockDetails;
      this.popupService.esencial = true
    }
    ;
  }
  //FUNCIONES EKEY
  crearEkey() {
    this.ekeyService.userID = this.userID;
    this.ekeyService.username = this.userID;
    this.ekeyService.lockID = this.lockId;
    this.ekeyService.endDateUser = this.endDateDeUser;
    this.ekeyService.lockAlias = this.Alias;
    this.popupService.createEkey = true;
    //this.router.navigate(["users", this.username, "lock", this.lockId, "ekey"]);
  }
  borrarEkey(ekeyID: number, ekeyUsername: string) {
    this.popupService.userID = this.userID;
    this.popupService.lockID = this.lockId;
    this.popupService.elementType = 'la ekey';
    this.popupService.elementID = ekeyID;
    this.popupService.ekeyUsername = ekeyUsername;
    this.popupService.delete = true;
  }
  cambiarNombreEkey(ekeyID: number) {
    this.popupService.userID = this.userID;
    this.popupService.lockID = this.lockId;
    this.popupService.elementType = 'ekey';
    this.popupService.elementID = ekeyID;
    this.popupService.cambiarNombre = true;
  }
  cambiarPeriodoEkey(ekeyID: number) {
    this.popupService.userID = this.userID;
    this.popupService.lockID = this.lockId;
    this.popupService.elementType = 'ekey';
    this.popupService.elementID = ekeyID;
    this.popupService.cambiarPeriodo = true;
  }
  congelar(ekeyID: number, user: string) {
    this.popupService.userID = this.userID;
    this.popupService.lockID = this.lockId;
    this.popupService.elementID = ekeyID;
    this.popupService.elementType = user;
    this.popupService.congelar = true;
  }
  descongelar(ekeyID: number, user: string) {
    this.popupService.userID = this.userID;
    this.popupService.lockID = this.lockId;
    this.popupService.elementID = ekeyID;
    this.popupService.elementType = user;
    this.popupService.descongelar = true;
  }
  Autorizar(ekeyID: number, user: string) {
    this.popupService.userID = this.userID;
    this.popupService.lockID = this.lockId;
    this.popupService.elementID = ekeyID;
    this.popupService.elementType = user;
    this.popupService.autorizar = true;
  }
  Desautorizar(ekeyID: number, user: string) {
    this.popupService.userID = this.userID;
    this.popupService.lockID = this.lockId;
    this.popupService.elementID = ekeyID;
    this.popupService.elementType = user;
    this.popupService.desautorizar = true;
  }
  aperturaRemota(ekeyID: number, remoteEnable: number) {
    this.popupService.userID = this.userID;
    this.popupService.lockID = this.lockId;
    this.popupService.elementID = ekeyID;
    this.popupService.remoteEnable = remoteEnable;
    this.popupService.changeRemoteEnable = true;
  }
  searchEkeys() {
    this.filtrarEkeys();
    this.ekeyService.ekeysDataSource = new MatTableDataSource(this.ekeys_filtradas);
  }
  filtrarEkeys() {
    this.ekeys_filtradas = this.ekeyService.ekeys.filter(ekey => {
      return (
        (ekey.keyName.toLowerCase().includes(this.textoBusqueda.toLowerCase())) ||
        ekey.username.toLowerCase().includes(this.textoBusqueda.toLowerCase()) ||
        this.lockService.formatTimestamp(ekey.date).includes(this.textoBusqueda) ||
        this.lockService.periodoValidezEkey(ekey).toLowerCase().includes(this.textoBusqueda.toLowerCase()) ||
        this.lockService.consultarEstadoEkey(ekey).toString().toLowerCase().includes(this.textoBusqueda.toLowerCase()) ||
        (ekey.keyRight === 0 ? 'Usuario' : 'Administrador Secundario').toLowerCase().includes(this.textoBusqueda.toLowerCase())
      );
    });
  }
  //FUNCIONES PASSCODE
  crearPasscode() {
    this.passcodeService.lockAlias = this.Alias;
    this.passcodeService.userID = this.userID;
    this.passcodeService.username = this.userID;
    this.passcodeService.lockID = this.lockId;
    this.passcodeService.endDateUser = this.endDateDeUser;
    this.passcodeService.gateway = Number(this.gateway)
    this.passcodeService.featureValue = this.featureValue;
    this.popupService.createPasscode = true;
    //this.router.navigate(["users", this.username, "lock", this.lockId, "passcode"]);
  }
  borrarPasscode(passcodeID: number) {
    if (this.gateway === '1') {
      this.popupService.userID = this.userID;
      this.popupService.lockID = this.lockId;
      this.popupService.elementType = 'el código';
      this.popupService.elementID = passcodeID;
      this.popupService.delete = true;
    } else {
      this.popupService.needGateway = true;
      console.log("Necesita estar conectado a un gateway para usar esta función")
    }
  }
  cambiarNombrePasscode(passcode: Passcode) {
    if (this.gateway === '1') {
      this.popupService.userID = this.userID;
      this.popupService.lockID = this.lockId;
      this.popupService.elementType = 'passcode';
      this.popupService.elementID = passcode.keyboardPwdId;
      this.popupService.passcode = passcode;
      this.popupService.cambiarNombre = true;
    } else {
      this.popupService.needGateway = true;
    }
  }
  cambiarPeriodoPasscode(passcode: Passcode) {
    if (this.gateway === '1') {
      this.popupService.userID = this.userID;
      this.popupService.lockID = this.lockId;
      this.popupService.elementType = 'passcode';
      this.popupService.elementID = passcode.keyboardPwdId;
      this.popupService.passcode = passcode;
      this.popupService.cambiarPeriodo = true;
    } else {
      this.popupService.needGateway = true;
    }
  }
  cambiarPasscode(passcode: Passcode) {
    if (this.gateway === '1') {
      this.popupService.userID = this.userID;
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
  compartirPasscode(passcode: Passcode) {
    this.popupService.userID = this.userID;
    this.popupService.lock_alias = this.Alias;
    this.popupService.passcode = passcode;
    this.popupService.sharePasscode = true;
  }
  searchPasscodes() {
    this.filtrarPasscodes();
    this.passcodeService.passcodesDataSource = new MatTableDataSource(this.passcodes_filtradas);
  }
  filtrarPasscodes() {
    this.passcodes_filtradas = this.passcodeService.passcodes.filter(passcode => {
      return (
        (passcode.keyboardPwdName && passcode.keyboardPwdName.toLowerCase().includes(this.textoBusqueda.toLowerCase())) ||
        passcode.keyboardPwd.toLowerCase().includes(this.textoBusqueda.toLowerCase()) ||
        passcode.senderUsername.toLowerCase().includes(this.textoBusqueda.toLowerCase()) ||
        this.lockService.formatTimestamp(passcode.sendDate).includes(this.textoBusqueda) ||
        this.lockService.periodoValidezPasscode(passcode).toLowerCase().includes(this.textoBusqueda.toLowerCase())
        //this.consultarEstado()
      );
    });
  }
  //FUNCIONES CARD
  crearCard() {
    if (this.gateway === '1') {
      this.cardService.userID = this.userID;
      this.cardService.lockID = this.lockId;
      this.cardService.endDateUser = this.endDateDeUser;
      this.popupService.createCard = true;
      //this.router.navigate(["users", this.username, "lock", this.lockId, "card"]);
    } else {
      this.popupService.needGateway = true;
      console.log("Necesita estar conectado a un gateway para usar esta función")
    }
  }
  borrarCard(cardID: number) {
    if (this.gateway === '1') {
      this.popupService.userID = this.userID;
      this.popupService.lockID = this.lockId;
      this.popupService.elementType = 'la tarjeta';
      this.popupService.elementID = cardID;
      this.popupService.delete = true;
    } else {
      this.popupService.needGateway = true;
      console.log("Necesita estar conectado a un gateway para usar esta función")
    }
  }
  cambiarNombreCard(cardID: number) {
    this.popupService.userID = this.userID;
    this.popupService.lockID = this.lockId;
    this.popupService.elementType = 'card';
    this.popupService.elementID = cardID;
    this.popupService.cambiarNombre = true;
  }
  cambiarPeriodoCard(cardID: number) {
    if (this.gateway === '1') {
      this.popupService.userID = this.userID;
      this.popupService.lockID = this.lockId;
      this.popupService.elementType = 'card';
      this.popupService.elementID = cardID;
      this.popupService.cambiarPeriodo = true;
    } else {
      this.popupService.needGateway = true;
      console.log("Necesita estar conectado a un gateway para usar esta función")
    }
  }
  searchCards() {
    this.filtrarCards();
    this.cardService.cardsDataSource = new MatTableDataSource(this.cards_filtradas);
  }
  filtrarCards() {
    this.cards_filtradas = this.cardService.cards.filter(card => {
      return (
        card.cardName.toLowerCase().includes(this.textoBusqueda.toLowerCase()) ||
        card.senderUsername.toLowerCase().includes(this.textoBusqueda.toLowerCase()) ||
        this.lockService.formatTimestamp(card.createDate).includes(this.textoBusqueda) ||
        this.lockService.periodoValidez(card.startDate, card.endDate).toLowerCase().includes(this.textoBusqueda.toLowerCase())
        //this.consultarEstado()
      );
    });
  }
  //FUNCIONES FINGERPRINT
  borrarFingerprint(fingerID: number) {
    if (this.gateway === '1') {
      this.popupService.userID = this.userID;
      this.popupService.lockID = this.lockId;
      this.popupService.elementType = 'la huella';
      this.popupService.elementID = fingerID;
      this.popupService.delete = true;
    } else {
      this.popupService.needGateway = true;
      console.log("Necesita estar conectado a un gateway para usar esta función")
    }
  }
  cambiarNombreFingerprint(fingerID: number) {
    this.popupService.userID = this.userID;
    this.popupService.lockID = this.lockId;
    this.popupService.elementType = 'fingerprint';
    this.popupService.elementID = fingerID;
    this.popupService.cambiarNombre = true;
  }
  cambiarPeriodoFingerprint(fingerID: number) {
    this.popupService.userID = this.userID;
    this.popupService.lockID = this.lockId;
    this.popupService.elementType = 'fingerprint';
    this.popupService.elementID = fingerID;
    this.popupService.cambiarPeriodo = true;
  }
  searchFingerprints() {
    this.filtrarFingerprints();
    this.fingerprintService.fingerprintsDataSource = new MatTableDataSource(this.fingerprints_filtradas);
  }
  filtrarFingerprints() {
    this.fingerprints_filtradas = this.fingerprintService.fingerprints.filter(finger => {
      return (
        finger.fingerprintName.toLowerCase().includes(this.textoBusqueda.toLowerCase()) ||
        finger.senderUsername.toLowerCase().includes(this.textoBusqueda.toLowerCase()) ||
        this.lockService.formatTimestamp(finger.createDate).includes(this.textoBusqueda) ||
        this.lockService.periodoValidezFingerprint(finger).toLowerCase().includes(this.textoBusqueda.toLowerCase())
        //this.consultarEstado()
      );
    });
  }
  exportFingerprints() {
    this.popupService.fingerprints = this.fingerprintService.fingerprints;
    this.popupService.excelFingerprints = true;
  }
  //FUNCIONES RECORD
  mostrarOperador(record: any) {
    if (record.keyName) {
      return record.keyName;
    } else if (record.username) {
      return record.username;
    } else {
      return '';
    }
  }

  async openExcelNameWindow() {
    this.allRecords = [];
    await this.fetchAllRecords(1);
    this.popupService.excelNameWindow = true;
    console.log(this.allRecords)
    this.popupService.records = this.allRecords;
  }
  searchRecords() {
    this.filtrarRecords();
    this.recordsDataSource = new MatTableDataSource(this.records_filtradas);
  }
  filtrarRecords() {
    this.records_filtradas = this.records.filter(record => {
      return (
        (record.username && record.username.toLowerCase().includes(this.textoBusqueda.toLowerCase())) ||
        this.lockService.consultarSuccess(record.success).toLowerCase().includes(this.textoBusqueda.toLowerCase()) ||
        this.lockService.formatTimestamp(record.serverDate).includes(this.textoBusqueda) ||
        this.lockService.consultarMetodo(record.recordTypeFromLock, record.username).toLowerCase().includes(this.textoBusqueda.toLowerCase())
      );
    });
  }
  onSelected(value: string): void {
    this.selectedType = value;
    this.fetchRecords();
  }
  fetchNextPage() {
    const nextPage = this.recordCurrentPage + 1;
    if (nextPage <= this.recordTotalPages) {
      this.fetchRecordsPage(nextPage);
    }
  }
  fetchPreviousPage() {
    const previousPage = this.recordCurrentPage - 1;
    if (previousPage >= 1) {
      this.fetchRecordsPage(previousPage);
    }
  }

}