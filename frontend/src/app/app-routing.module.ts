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
import { MultipleEkeyComponent } from './components/access_methods/multiple-ekey/multiple-ekey.component';

/* =========================
   LAYOUTS
========================= */
import { TTLockComponent } from './layouts/ttlock/ttlock.component';

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
      { path: 'lock/:id/ekey/multiple', component: MultipleEkeyComponent },
      { path: 'users/:username/lock/:id/passcode/multiple', component: MultiplePasscodeComponent },
      { path: 'lock/:id/card/multiple', component: MultipleCardsComponent },
    ]
  },
  // Old ONE URLs can remain in bookmarks and browser history after the split.
  // Keep app.vohk.cl inside the legacy site instead of leaving an unmatched route.
  { path: '**', redirectTo: '' }

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
