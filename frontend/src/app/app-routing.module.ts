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

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'users/:username', component: UserComponent },
  { path: 'users/:username/grupos', component: GrupoCerradurasComponent },
  { path: 'users/:username/lock/:id', component: LockComponent },
  { path: 'users/:username/lock/:id/passcode', component: PasscodeComponent },
  { path: 'users/:username/lock/:id/ekey', component: EkeyComponent },
  { path: 'users/:username/lock/:id/card', component: CardComponent },
  { path: 'users/:username/lock/:id/ekey/multiple', component: MultipleEkeyComponent },
  { path: 'users/:username/lock/:id/passageMode', component: PassageModeComponent },
  { path: 'users/:username/lock/:id/transferLock', component: TransferLockComponent },
  { path: 'testing/camera', component: CameraStreamComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
