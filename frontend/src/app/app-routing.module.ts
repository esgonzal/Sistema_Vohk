import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components//login/login.component';
import { UserComponent } from './components/user/user.component';
import { LockComponent } from './components/lock/lock.component';
import { PasscodeComponent } from './components/passcode/passcode.component';
import { EkeyComponent } from './components/ekey/ekey.component';
import { PassageModeComponent } from './components/passage-mode/passage-mode.component';
import { TransferLockComponent } from './components/transfer-lock/transfer-lock.component';
import { GrupoCerradurasComponent } from './components/grupo-cerraduras/grupo-cerraduras.component';
import { MultipleEkeyComponent } from './components/multiple-ekey/multiple-ekey.component';
import { CardComponent } from './components/card/card.component';
import { CameraStreamComponent } from './components/camera-stream/camera-stream.component';
import { ComunidadesComponent } from './components/comunidades/comunidades.component';
import { TemporalPasscodeComponent } from './components/temporal-passcode/temporal-passcode.component';
import { Loginv2Component } from './components/loginv2/loginv2.component';
import { Comunidadesv2Component } from './components/comunidadesv2/comunidadesv2.component';
import { Lockv2Component } from './components/lockv2/lockv2.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', component: ComunidadesComponent },
  { path: 'users/:username', component: UserComponent },
  { path: 'users/:username/grupos', component: GrupoCerradurasComponent },
  { path: 'users/:username/lock/:id', component: LockComponent },
  { path: 'users/:username/lock/:id/passcode', component: PasscodeComponent },
  { path: 'users/:username/lock/:id/passcode2', component: TemporalPasscodeComponent },
  { path: 'users/:username/lock/:id/ekey', component: EkeyComponent },
  { path: 'users/:username/lock/:id/card', component: CardComponent },
  { path: 'users/:username/lock/:id/ekey/multiple', component: MultipleEkeyComponent },
  { path: 'users/:username/lock/:id/passageMode', component: PassageModeComponent },
  { path: 'users/:username/lock/:id/transferLock', component: TransferLockComponent },
  { path: 'testing/camera', component: CameraStreamComponent},
  { path: 'loginv2', component: Loginv2Component },
  { path: 'comunidadesv2', component: Comunidadesv2Component },
  { path: 'lockv2', component: Lockv2Component },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
