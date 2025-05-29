import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { Loginv2Component } from './components/loginv2/loginv2.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { Comunidadesv2Component } from './components/comunidadesv2/comunidadesv2.component';
import { Lockv2Component } from './components/lockv2/lockv2.component';
import { EkeyComponent } from './components/ekey/ekey.component';
import { PasscodeComponent } from './components/passcode/passcode.component';
import { CardComponent } from './components/card/card.component';
import { MultipleEkeyComponent } from './components/multiple-ekey/multiple-ekey.component';
import { PopUpComponent } from './components/pop-up/pop-up.component';
import { PassageModeComponent } from './components/passage-mode/passage-mode.component';
import { TransferLockComponent } from './components/transfer-lock/transfer-lock.component';
import { TransferHubComponent } from './components/transfer-hub/transfer-hub.component';

import { LoaderComponent } from './components/loader/loader.component';
import { CameraStreamComponent } from './components/camera-stream/camera-stream.component';

import { DatePipe } from '@angular/common';
import { HttpClientModule } from "@angular/common/http";

import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';

import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table'
import { MatButtonModule } from '@angular/material/button'
import { MatDialogModule } from '@angular/material/dialog'
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AppRoutingModule } from './app-routing.module';
import { RouterModule } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { GroupService } from './services/group.service';

import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { SidebarComponent } from './sidebar/sidebar.component';
import { DocumentationComponent } from './documentation/documentation.component';


export const CUSTOM_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
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
    NavbarComponent,
    PasscodeComponent,
    EkeyComponent,
    PopUpComponent,
    PassageModeComponent,
    TransferLockComponent,
    MultipleEkeyComponent,
    LoaderComponent,
    CardComponent,
    CameraStreamComponent,
    Loginv2Component,
    Comunidadesv2Component,
    Lockv2Component,
    TransferHubComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    MatExpansionModule,
    BrowserAnimationsModule,
    MatTabsModule,
    MatTableModule,
    FontAwesomeModule,
    MatButtonModule,
    MatDialogModule,
    MatCardModule,
    MatGridListModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    MatFormFieldModule,
    NgxMaterialTimepickerModule,
    MatMenuModule,
    MatIconModule,
    MatSlideToggleModule,
    AppRoutingModule,
    MatTooltipModule,
    RouterModule.forRoot([])
  ],
  providers: [
    DatePipe, 
    GroupService,
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' }, // Configuración regional
    { provide: MAT_DATE_FORMATS, useValue: CUSTOM_DATE_FORMATS }, // Formato DD/MM/YYYY
    ],
  bootstrap: [AppComponent]
})
export class AppModule { }
