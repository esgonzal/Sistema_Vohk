import { Component } from '@angular/core';
import { Formulario } from '../../Interfaces/Formulario';
import { PasscodeServiceService } from '../../services/passcode-service.service';
import { Router } from '@angular/router';
import moment from 'moment';
import { LockServiceService } from '../../services/lock-service.service';
import { PopUpService } from '../../services/pop-up.service';
import { createPasscodeResponse } from '../../Interfaces/API_responses';
import { lastValueFrom } from 'rxjs';
import { faHome, faLock, faHashtag } from '@fortawesome/free-solid-svg-icons';
import { UserServiceService } from 'src/app/services/user-service.service';

@Component({
  selector: 'app-temporal-passcode',
  templateUrl: './temporal-passcode.component.html',
  styleUrls: ['./temporal-passcode.component.css'],
})
export class TemporalPasscodeComponent {
  constructor(
    public passcodeService: PasscodeServiceService,
    public lockService: LockServiceService,
    private router: Router,
    public popupService: PopUpService,
    private userService: UserServiceService
  ) {
    if (!this.passcodeService.userID || !this.passcodeService.username || !this.passcodeService.lockID || !this.passcodeService.endDateUser) {
      this.router.navigate(['users', sessionStorage.getItem('user'), 'lock', sessionStorage.getItem('lockID')]);
    }
  }

  faHome = faHome;
  faLock = faLock;
  faHashtag = faHashtag;
  isLoading: boolean = false;
  error = '';
  passcodeDuration = '';

  validaFechaUsuario(): boolean {
    if (this.passcodeService.endDateUser !== '0') {
      let unixTimestamp = parseInt(this.passcodeService.endDateUser);
      let endUser = moment.unix(unixTimestamp / 1000);
      let ahora = moment().valueOf();
      let final = moment(ahora).add(3, 'hours').valueOf();
      if (endUser.isBefore(final)) {
        this.error = 'La clave termina posterior a su permiso de autorización, comuníquese con el administrador de esta cerradura';
        //El usuario termina antes que la clave
        return false;
      } else {
        //El usuario termina despues que la clave
        return true;
      }
    } else {
      //El usuario es permanente
      return true;
    }
  }
  async crearpasscode(datos: Formulario) {
    let response;
    this.isLoading = true;
    try {
      //PERIODIC PASSCODE
      let ahora = moment().valueOf();
      let final = moment(ahora).add(3, 'hours').valueOf();
      console.log(datos.name)
      response = (await lastValueFrom(this.passcodeService.generatePasscode(this.passcodeService.userID, this.passcodeService.lockID, '3', ahora.toString(), datos.name, final.toString()))) as createPasscodeResponse;
      if (response?.keyboardPwdId) {
        this.router.navigate(['users', this.passcodeService.username, 'lock', this.passcodeService.lockID]);
        console.log('Se creó la passcode con exito');
      } else if (response?.errcode === 10003) {
        sessionStorage.clear();
      } else {
        console.log('ERROR:', response);
      }
    } catch (error) {
      console.error('Error while creating Passcode:', error);
    } finally {
      this.isLoading = false;
    }
  }
  validarNuevaPass(datos: Formulario) {
    this.error = '';
    if (this.validaFechaUsuario()) {
      this.crearpasscode(datos);
    }
  }
  onSelected(value: string): void {//Guarda el tipo de eKey seleccionado
    this.passcodeDuration = value
  }
}
