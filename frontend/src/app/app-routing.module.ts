import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Loginv2Component } from './components/loginv2/loginv2.component';
import { Comunidadesv2Component } from './components/comunidadesv2/comunidadesv2.component';
import { Lockv2Component } from './components/lockv2/lockv2.component';
import { EkeyComponent } from './components/ekey/ekey.component';
import { PasscodeComponent } from './components/passcode/passcode.component';
import { CardComponent } from './components/card/card.component';
import { MultipleEkeyComponent } from './components/multiple-ekey/multiple-ekey.component';
import { CameraStreamComponent } from './components/camera-stream/camera-stream.component';

const routes: Routes = [
  { path: 'login', component: Loginv2Component },
  { path: '', component: Comunidadesv2Component },
  { path: 'users/:username/lock/:id', component: Lockv2Component },
  { path: 'users/:username/lock/:id/ekey', component: EkeyComponent },
  { path: 'users/:username/lock/:id/passcode', component: PasscodeComponent },
  { path: 'users/:username/lock/:id/card', component: CardComponent },
  { path: 'users/:username/lock/:id/ekey/multiple', component: MultipleEkeyComponent },
  { path: 'testing/camera', component: CameraStreamComponent},
  
  
  
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
