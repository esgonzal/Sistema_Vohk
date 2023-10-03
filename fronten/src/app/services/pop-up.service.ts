import { Injectable } from '@angular/core';
import { Passcode } from '../Interfaces/Elements';
import { LockData, LockDetails } from '../Interfaces/Lock';
import { GatewayAccount, GatewayLock } from '../Interfaces/Gateway';
import { Group } from '../Interfaces/Group';
import { RecipientList } from '../Interfaces/RecipientList';

@Injectable({
  providedIn: 'root'
})
export class PopUpService {

  registro = false;                      //Al finalizar un registro exitoso, se muestra un pop up con un mensaje de bienvenida
  delete = false;                        //Antes de borrar algo, se muestra un pop up para confirmar la accion
  autorizar = false;                     //Antes de autorizar a alguien, se muestra un pop up para confirmar la accion
  desautorizar = false;                  //Antes de desautorizar a alguien, se muestra un pop up para confirmar la accion
  autorizarFalso = false;                //Antes de autorizar a alguien, se muestra un pop up para confirmar la accion
  desautorizarFalso = false;             //Antes de desautorizar a alguien, se muestra un pop up para confirmar la accion
  congelar = false;                      //Antes de congelar a alguien, se muestra un pop up para confirmar la accion
  descongelar = false;                   //Antes de descongelar a alguien, se muestra un pop up para confirmar la accion
  cambiarNombre = false;                 //La accion de cambiar nombre se hace en un pop up
  cambiarPeriodo = false;                //La accion de cambiar periodo se hace en un pop up
  editarPasscode = false;                //La accion de editar una passcode se hace en un pop up
  esencial = false;                      //La informacion esencial se muestra en un pop up
  gateway = false;                       //La informacion de gateway se muestra en un pop up
  mostrarHora = false;                   //La informacion de hora se muestra en un pop up
  cerradoAutomatico = false;             //La accion de cambiar autoLock se hace en un pop up
  needGateway = false;                   //Cuando presionas una funcion que necesita gateway, y no tienes, se abre este pop up
  invalidLock = false;                   //Cuando te intentas meter a una cerradura a la cual ya no tienes acceso, se abre este pop up
  newGroup = false;                      //La accion de crear un nuevo grupo se hace en un pop up
  addRemoveLockGROUP = false;            //El boton cerraduras muestra este pop up con los botones para agregar o quitar cerradura del grupo
  addLockGROUP = false;                  //La accion de agregar una cerradura al grupo se hace en un pop up
  removeLockGROUP = false;               //La accion de quitar una cerradura del grupo se hace en un pop up
  selectLocksForMultipleEkeys = false;   //La accion de seleccionar cerraduras para enviar multiples ekeys se hace en un pop up
  addRecipientsForMultipleEkeys = false; //La accion de agregar receptores para enviar multiples ekeys se hace en un pop up
  resetPassword = false;                 //La accion de cambiar contraseña de un usuario se hace en un pop up
  sharePasscode = false;                 //La accion de compartir código se hace en un pop up
  wrongAccountType = false;              //Para cambiar la contraseña, se necesita que la cuenta sea creada dentro del sistema
  transferLockWarning = false;           //Antes de transferir la cerradura a otra cuenta, se muestra un popup para confirmar
  changeNickname = false;
  gatewaysOfLock: GatewayLock[] = []
  gatewaysOfAccount: GatewayAccount[] = []
  detalles: LockDetails;
  currentTime: number;
  welcomingMessage: string;
  token: string;
  lockID: number;
  elementType: string;
  elementID: number;
  ekeyUsername: string;
  passcode: Passcode;
  group: Group;
  locksWithoutGroup: LockData[];
  selectedLockIds_forMultipleEkeys: number[] = [];
  recipients: RecipientList[] = [];
  transferLockReciever: string;
  newIsUser: boolean;
  accountName: string;
  password: string;

  toggleLockSelection(lockId: number) {
    const index = this.selectedLockIds_forMultipleEkeys.indexOf(lockId);
    if (index !== -1) {
      // If lock ID is already in the array, remove it
      this.selectedLockIds_forMultipleEkeys.splice(index, 1);
    } else {
      // If lock ID is not in the array, add it
      this.selectedLockIds_forMultipleEkeys.push(lockId);
    }
    console.log("selectedLockIds: ", this.selectedLockIds_forMultipleEkeys)
  }
}
