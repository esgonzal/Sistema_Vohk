import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

/* =========================
   TTLOCK COMPONENTS
========================= */
import { Loginv2Component } from './components/loginv2/loginv2.component';
import { Comunidadesv2Component } from './components/comunidadesv2/comunidadesv2.component';
import { Lockv2Component } from './components/lockv2/lockv2.component';
import { EkeyComponent } from './components/access_methods/ekey/ekey.component';
import { PasscodeComponent } from './components/access_methods/passcode/passcode.component';
import { CardComponent } from './components/access_methods/card/card.component';
import { MultipleEkeyComponent } from './components/access_methods/multiple-ekey/multiple-ekey.component';
import { MultiplePasscodeComponent } from './components/access_methods/multiple-passcode/multiple-passcode/multiple-passcode.component';
import { MultipleCardsComponent } from './components/access_methods/multiple-cards/multiple-cards.component';

/* =========================
   ADMIN COMPONENTS
========================= */
import { InvitationComponent } from './components/vohk_app/invitation/invitation.component';
import { CondominiumsComponent } from './components/vohk_app/condominiums/condominiums.component';
import { BuildingsComponent } from './components/vohk_app/buildings/buildings.component';
import { UnitsComponent } from './components/vohk_app/units/units.component';
import { ResidentsComponent } from './components/vohk_app/residents/residents.component';
import { CondominiumDashboardComponent } from './components/vohk_app/condominium-dashboard/condominium-dashboard.component';

/* =========================
   LAYOUTS
========================= */
import { TTLockComponent } from './layouts/ttlock/ttlock.component';
import { AdminComponent } from './layouts/admin/admin.component';
import { LoginComponent } from './components/vohk_app/login/login.component';

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
      { path: 'users/:username/lock/:id', component: Lockv2Component },
      { path: 'users/:username/lock/:id/ekey', component: EkeyComponent },
      { path: 'users/:username/lock/:id/passcode', component: PasscodeComponent },
      { path: 'users/:username/lock/:id/card', component: CardComponent },
      { path: 'users/:username/lock/:id/ekey/multiple', component: MultipleEkeyComponent },
      { path: 'users/:username/lock/:id/passcode/multiple', component: MultiplePasscodeComponent },
      { path: 'users/:username/lock/:id/card/multiple', component: MultipleCardsComponent },
    ]
  },

  /* =========================
     ADMIN SYSTEM (NEW VOHK)
  ========================= */
  {
    path: 'admin',
    component: AdminComponent,
    children: [
      { path: 'login', component: LoginComponent }, // placeholder if needed later
      { path: 'invite/:id', component: InvitationComponent },
      { path: 'condominiums', component: CondominiumsComponent },
      { path: 'condominiums/:id', component: CondominiumDashboardComponent },
      { path: 'condominiums/:id/buildings', component: BuildingsComponent },
      { path: 'buildings/:id/units', component: UnitsComponent },
      { path: 'units/:id/residents', component: ResidentsComponent },
    ]
  }

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }