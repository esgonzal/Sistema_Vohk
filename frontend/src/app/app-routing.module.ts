import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components//login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { UserComponent } from './components/user/user.component';
import { LockComponent } from './components/lock/lock.component';
import { PasscodeComponent } from './components/passcode/passcode.component';
import { EkeyComponent } from './components/ekey/ekey.component';
import { PassageModeComponent } from './components/passage-mode/passage-mode.component';
import { TransferLockComponent } from './components/transfer-lock/transfer-lock.component';
import { HomeComponent } from './components/home/home.component';
import { PerfilComponent } from './components/perfil/perfil.component';
import { GrupoCerradurasComponent } from './components/grupo-cerraduras/grupo-cerraduras.component';
import { MultipleEkeyComponent } from './components/multiple-ekey/multiple-ekey.component';
import { GroupDataLoadedGuard } from './guards/group-data-loaded.guard';

const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'users/:username', component: UserComponent },
  { path: 'users/:username/perfil', component: PerfilComponent },
  { path: 'users/:username/grupos', component: GrupoCerradurasComponent },
  { path: 'users/:username/lock/:id', component: LockComponent },
  { path: 'users/:username/lock/:id/passcode', component: PasscodeComponent },
  { path: 'users/:username/lock/:id/ekey', component: EkeyComponent },
  { path: 'users/:username/lock/:id/ekey/multiple', component: MultipleEkeyComponent },
  { path: 'users/:username/lock/:id/passageMode', component: PassageModeComponent },
  { path: 'users/:username/lock/:id/transferLock', component: TransferLockComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
