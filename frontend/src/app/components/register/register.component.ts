import { Component } from '@angular/core';
import { User } from '../../Interfaces/User';
import { UserServiceService } from '../../services/user-service.service';
import { PopUpService } from '../../services/pop-up.service';
import { lastValueFrom } from 'rxjs';
import { GetAccessTokenResponse, UserRegisterResponse, checkUserInDBResponse } from '../../Interfaces/API_responses';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  providers: [UserServiceService]
})
export class RegisterComponent {

  constructor(private userService: UserServiceService, public popupService: PopUpService) { }

  ngOnInit() { }

  registerError: string = "";

  validarInputs(data: User) {
    if (data.username == '' || data.password == '' || data.confirmPassword == '') {
      this.registerError = 'Nombre de usuario y/o contraseña inválidos '
      return false;
    } else {
      if (data.password !== data.confirmPassword) {
        this.registerError = 'Las contraseñas son diferentes'
        return false;
      } else {
        const passwordPattern = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordPattern.test(data.password)) {
          this.registerError = 'Tu contraseña debe tener entre 8-20 caracteres e incluir al menos dos tipos de números, letras y símbolos'
          return false;
        } else {
          return true;
        }
      }
    }
  }
  async validarCuentaNueva(data: User) {
    const response = await lastValueFrom(this.userService.getAccessToken(data.username, data.password)) as GetAccessTokenResponse;
    if (response.errcode === 'Success') {//Ya existe una cuenta TTLock con este email/telefono
      this.registerError = 'Ya existe una cuenta con este email o teléfono'
      return false;
    } else {
      return true;
    }
  }
  async signUp(data: User) {
    try {
      if (this.validarInputs(data)) {
        if (await this.validarCuentaNueva(data)) {
          if (this.userService.isValidEmail(data.username) || this.userService.isValidPhone(data.username).isValid) {
            let response = await lastValueFrom(this.userService.UserRegister(data.username, data.password)) as UserRegisterResponse
            if (response.errcode === 0) {
              console.log("Usuario registrado");
            } else if (response.errcode === 30003) {
              this.registerError = 'Ya existe una cuenta asociada con el correo electrónico'
            } else if (response.errcode === 30002) {//Nunca debería ocurrir esto porque el nombre se codifica
              this.registerError = 'Solo se permiten digitos y caracteres del alfabeto ingles'
            } else if (response.errcode === 90000) {
              this.registerError = 'el email ingresado es muy largo'
            }
          } else {//No es email ni telefono
            this.registerError = 'Debe ingresar un correo electrónico o un número con prefijo telefónico (+XX)';
          }
        }
      }
    } catch (error) {
      console.error("An error occurred:", error);
    }
  }
}
