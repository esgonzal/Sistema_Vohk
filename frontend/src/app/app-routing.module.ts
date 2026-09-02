import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard, authChildGuard } from './guards/auth.guard';

/* =========================
   TTLOCK COMPONENTS
========================= */
import { Loginv2Component } from './components/loginv2/loginv2.component';
import { Comunidadesv2Component } from './components/comunidadesv2/comunidadesv2.component';
import { Lockv2Component } from './components/lockv2/lockv2.component';
import { MultiplePasscodeComponent } from './components/access_methods/multiple-passcode/multiple-passcode/multiple-passcode.component';
import { MultipleCardsComponent } from './components/access_methods/multiple-cards/multiple-cards.component';
import { MultipleEkeyComponent } from './components/access_methods/multiple-ekey/multiple-ekey.component';

/* =========================
   ADMIN COMPONENTS
========================= */
import { CondominiumsComponent } from './components/vohk_app/condominiums/condominiums.component';
import { UnitsComponent } from './components/vohk_app/units/units.component';

/* =========================
   LAYOUTS
========================= */
import { TTLockComponent } from './layouts/ttlock/ttlock.component';
import { AdminComponent } from './layouts/admin/admin.component';
import { LoginComponent } from './components/vohk_app/login/login.component';
import { ResetPasswordComponent } from './components/vohk_app/reset-password/reset-password.component';
import { DashboardComponent } from './components/vohk_app/dashboard/dashboard.component';
import { UserComponent } from './components/vohk_app/user/user.component';
import { ConserjeriaComponent } from './components/vohk_app/conserjeria/conserjeria.component';
import { DeviceComponent } from './components/vohk_app/device/device.component';
import { PrivacyPolicyComponent } from './components/privacy-policy/privacy-policy.component';

const routes: Routes = [

  /* =========================
     PUBLIC LEGAL PAGES
  ========================= */
  { path: 'politica-de-privacidad', component: PrivacyPolicyComponent },

  /* =========================
     TTLOCK SYSTEM (LEGACY)
  ========================= */
  {
    path: '',
    component: TTLockComponent,
    children: [
      { path: 'login', component: Loginv2Component },
      { path: '', component: Comunidadesv2Component },
      { path: 'lock/:id', component: Lockv2Component },
      { path: 'lock/:id/ekey/multiple', component: MultipleEkeyComponent },
      { path: 'users/:username/lock/:id/passcode/multiple', component: MultiplePasscodeComponent },
      { path: 'lock/:id/card/multiple', component: MultipleCardsComponent },
    ]
  },

  /* =========================
     ADMIN PUBLIC
  ========================= */
  { path: 'admin/login', component: LoginComponent },
  { path: 'admin/reset-password/:token', component: ResetPasswordComponent },
  /* =========================
     ADMIN PRIVATE
  ========================= */
  {
    path: 'admin', component: AdminComponent, canActivate: [authGuard], canActivateChild: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'condominiums', component: CondominiumsComponent },
      { path: 'usuarios', component: UserComponent },
      { path: 'unidades', component: UnitsComponent },
      { path: 'dispositivos', component: DeviceComponent },
      { path: 'conserjeria', component: ConserjeriaComponent }
    ]
  }

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
