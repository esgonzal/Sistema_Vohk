import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PrivacyPolicyComponent } from './components/privacy-policy/privacy-policy.component';
import { CondominiumsComponent } from './components/vohk_app/condominiums/condominiums.component';
import { ConserjeriaComponent } from './components/vohk_app/conserjeria/conserjeria.component';
import { DashboardComponent } from './components/vohk_app/dashboard/dashboard.component';
import { DeviceComponent } from './components/vohk_app/device/device.component';
import { LoginComponent } from './components/vohk_app/login/login.component';
import { ResetPasswordComponent } from './components/vohk_app/reset-password/reset-password.component';
import { UnitsComponent } from './components/vohk_app/units/units.component';
import { UserComponent } from './components/vohk_app/user/user.component';
import { authGuard } from './guards/auth.guard';
import { AdminComponent } from './layouts/admin/admin.component';

const routes: Routes = [
  { path: 'politica-de-privacidad', component: PrivacyPolicyComponent },
  { path: 'admin/login', component: LoginComponent },
  { path: 'admin/reset-password/:token', component: ResetPasswordComponent },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'condominiums', component: CondominiumsComponent },
      { path: 'usuarios', component: UserComponent },
      { path: 'unidades', component: UnitsComponent },
      { path: 'dispositivos', component: DeviceComponent },
      { path: 'conserjeria', component: ConserjeriaComponent },
    ],
  },
  { path: '', redirectTo: 'admin/login', pathMatch: 'full' },
  { path: '**', redirectTo: 'admin/login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
