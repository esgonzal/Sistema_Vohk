import { DatePipe } from '@angular/common';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PrivacyPolicyComponent } from './components/privacy-policy/privacy-policy.component';
import { CondominiumsComponent } from './components/vohk_app/condominiums/condominiums.component';
import { ConserjeriaComponent } from './components/vohk_app/conserjeria/conserjeria.component';
import { DashboardComponent } from './components/vohk_app/dashboard/dashboard.component';
import { DeviceComponent } from './components/vohk_app/device/device.component';
import { LoginComponent } from './components/vohk_app/login/login.component';
import { ResetPasswordComponent } from './components/vohk_app/reset-password/reset-password.component';
import { UnitsComponent } from './components/vohk_app/units/units.component';
import { UserComponent } from './components/vohk_app/user/user.component';
import { AdminComponent } from './layouts/admin/admin.component';
import { SidebarComponent } from './layouts/admin/sidebar/sidebar.component';
import { TopbarComponent } from './layouts/admin/topbar/topbar.component';
import { AuthInterceptor } from './services/vohk_app/auth.interceptor';

export const CUSTOM_DATE_FORMATS = {
  parse: { dateInput: 'DD/MM/YYYY' },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@NgModule({
  declarations: [
    AppComponent,
    AdminComponent,
    SidebarComponent,
    TopbarComponent,
    CondominiumsComponent,
    ConserjeriaComponent,
    DashboardComponent,
    DeviceComponent,
    LoginComponent,
    ResetPasswordComponent,
    UnitsComponent,
    UserComponent,
    PrivacyPolicyComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    MatDatepickerModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatMenuModule,
    MatNativeDateModule,
    MatSlideToggleModule,
    MatTableModule,
    MatTooltipModule,
  ],
  providers: [
    DatePipe,
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' },
    { provide: MAT_DATE_FORMATS, useValue: CUSTOM_DATE_FORMATS },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
