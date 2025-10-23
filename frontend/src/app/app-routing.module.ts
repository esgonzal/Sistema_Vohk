import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Loginv2Component } from './components/loginv2/loginv2.component';
import { Comunidadesv2Component } from './components/comunidadesv2/comunidadesv2.component';
import { Lockv2Component } from './components/lockv2/lockv2.component';
import { EkeyComponent } from './components/access_methods/ekey/ekey.component';
import { PasscodeComponent } from './components/access_methods/passcode/passcode.component';
import { CardComponent } from './components/access_methods/card/card.component';
import { MultipleEkeyComponent } from './components/access_methods/multiple-ekey/multiple-ekey.component';
import { CameraComponent } from './components/camera/camera.component';
import { MultiplePasscodeComponent } from './components/access_methods/multiple-passcode/multiple-passcode/multiple-passcode.component';
import { MultipleCardsComponent } from './components/access_methods/multiple-cards/multiple-cards.component';

const routes: Routes = [
  { path: 'login', component: Loginv2Component },
  { path: '', component: Comunidadesv2Component },
  { path: 'users/:username/lock/:id', component: Lockv2Component },
  { path: 'users/:username/lock/:id/ekey', component: EkeyComponent },
  { path: 'users/:username/lock/:id/passcode', component: PasscodeComponent },
  { path: 'users/:username/lock/:id/card', component: CardComponent },
  { path: 'users/:username/lock/:id/ekey/multiple', component: MultipleEkeyComponent },
  { path: 'users/:username/lock/:id/passcode/multiple', component: MultiplePasscodeComponent },
  { path: 'users/:username/lock/:id/card/multiple', component: MultipleCardsComponent },
  { path: 'test/camera', component: CameraComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

