import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { faBatteryFull, faWifi, faGear, faDoorOpen, faPlus } from '@fortawesome/free-solid-svg-icons'
import { LockServiceService } from '../../services/lock-service.service';
import { EkeyServiceService } from '../../services/ekey-service.service';
import { PasscodeServiceService } from '../../services/passcode-service.service';
import { CardServiceService } from '../../services/card-service.service';
import { FingerprintServiceService } from '../../services/fingerprint-service.service';
import { RecordServiceService } from '../../services/record-service.service';
import { PopUpService } from '../../services/pop-up.service';
import { GatewayService } from '../../services/gateway.service';
import { PassageModeService } from '../../services/passage-mode.service';
import { UserServiceService } from '../../services/user-service.service';
import { operationResponse } from '../../Interfaces/API_responses';
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
  accessToken = sessionStorage.getItem('accessToken') ?? ''
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
  lockGroupID = sessionStorage.getItem('lockGroupID') ?? '';
  locksOfGroup: LockData[] = [];
  pageLoaded = false;
  isLoading: boolean = false;
  lockDetails: LockDetails;
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

  constructor(
    public ekeyService: EkeyServiceService,
    public passcodeService: PasscodeServiceService,
    public cardService: CardServiceService,
    public fingerprintService: FingerprintServiceService,
    public recordService: RecordServiceService,
    private gatewayService: GatewayService,
    private passageModeService: PassageModeService,
    public popupService: PopUpService,
    public lockService: LockServiceService,
    public userService: UserServiceService,
    public DarkModeService: DarkModeService
  ) { }


  async ngOnInit() {
    this.isLoading = true;
    const res = await lastValueFrom(this.ekeyService.getEkeysofAccount(this.accessToken, Number(this.lockGroupID)));
    this.locksOfGroup = res.list ?? [];
    console.log(this.locksOfGroup)
    try {
    } finally {
      this.pageLoaded = true;
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
        } else if (response.errcode === 10003) {
          sessionStorage.clear();
        } else {
          console.log(response)
        }
      } catch (error) {
        console.error("Error while fetching passage mode configurations:", error)
      } finally {
        this.isLoading = false;
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
    this.popupService.invitation = true;
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
  //FUNCIONES CARD

}