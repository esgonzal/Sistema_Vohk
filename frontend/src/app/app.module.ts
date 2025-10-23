import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { Loginv2Component } from './components/loginv2/loginv2.component';
import { NavbarComponent } from './components/functions/navbar/navbar.component';
import { Comunidadesv2Component } from './components/comunidadesv2/comunidadesv2.component';
import { Lockv2Component } from './components/lockv2/lockv2.component';
import { EkeyComponent } from './components/access_methods/ekey/ekey.component';
import { PasscodeComponent } from './components/access_methods/passcode/passcode.component';
import { CardComponent } from './components/access_methods/card/card.component';
import { MultipleEkeyComponent } from './components/access_methods/multiple-ekey/multiple-ekey.component';
import { PopUpComponent } from './components/pop-up/pop-up.component';
import { PassageModeComponent } from './components/functions/passage-mode/passage-mode.component';
import { TransferLockComponent } from './components/functions/transfer-lock/transfer-lock.component';
import { TransferHubComponent } from './components/functions/transfer-hub/transfer-hub.component';

import { LoaderComponent } from './components/functions/loader/loader.component';

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
import { MatListModule } from '@angular/material/list'

import { AppRoutingModule } from './app-routing.module';
import { RouterModule } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { GroupService } from './services/group.service';

import { MAT_DATE_FORMATS } from '@angular/material/core';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { CameraComponent } from './components/camera/camera.component';
import { AccessModalComponent } from './components/access_methods/access-modal/access-modal.component';
import { FunctionsModalComponent } from './components/functions/functions-modal/functions-modal.component';
import { MultiplePasscodeComponent } from './components/access_methods/multiple-passcode/multiple-passcode/multiple-passcode.component';
import { MultipleCardsComponent } from './components/access_methods/multiple-cards/multiple-cards.component';


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
    Loginv2Component,
    Comunidadesv2Component,
    Lockv2Component,
    TransferHubComponent,
    CameraComponent,
    AccessModalComponent,
    FunctionsModalComponent,
    MultiplePasscodeComponent,
    MultipleCardsComponent,
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
    MatListModule,
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
