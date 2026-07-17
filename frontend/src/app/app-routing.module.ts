import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

/* =========================
   TTLOCK COMPONENTS
========================= */
import { Loginv2Component } from './components/loginv2/loginv2.component';
import { Comunidadesv2Component } from './components/comunidadesv2/comunidadesv2.component';
import { Lockv2Component } from './components/lockv2/lockv2.component';
import { MultiplePasscodeComponent } from './components/access_methods/multiple-passcode/multiple-passcode/multiple-passcode.component';
import { MultipleCardsComponent } from './components/access_methods/multiple-cards/multiple-cards.component';

/* =========================
   ADMIN COMPONENTS
========================= */
import { InvitationComponent } from './components/vohk_app/invitation/invitation.component';
import { CondominiumsComponent } from './components/vohk_app/condominiums/condominiums.component';
import { UnitsComponent } from './components/vohk_app/units/units.component';
import { ResidentsComponent } from './components/vohk_app/residents/residents.component';
import { CondominiumDashboardComponent } from './components/vohk_app/condominium-dashboard/condominium-dashboard.component';

/* =========================
   LAYOUTS
========================= */
import { TTLockComponent } from './layouts/ttlock/ttlock.component';
import { AdminComponent } from './layouts/admin/admin.component';
import { LoginComponent } from './components/vohk_app/login/login.component';
import { ResetPasswordComponent } from './components/vohk_app/reset-password/reset-password.component';
import { DashboardComponent } from './components/vohk_app/dashboard/dashboard.component';
import { UserComponent } from './components/vohk_app/user/user.component';

const routes: Routes = [

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
      { path: 'users/:username/lock/:id/passcode/multiple', component: MultiplePasscodeComponent },
      { path: 'users/:username/lock/:id/card/multiple', component: MultipleCardsComponent },
    ]
  },

  /* =========================
     ADMIN PUBLIC
  ========================= */
  { path: 'admin/login', component: LoginComponent },
  { path: 'admin/reset-password/:token', component: ResetPasswordComponent },
  { path: 'admin/invite/:id', component: InvitationComponent },
  /* =========================
     ADMIN PRIVATE
  ========================= */
  {
    path: 'admin', component: AdminComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'condominiums', component: CondominiumsComponent },
      { path: 'unidades', component: UnitsComponent },
      { path: 'usuarios', component: UserComponent },
    ]
  }

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }