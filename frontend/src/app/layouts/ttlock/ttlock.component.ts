import { Component } from '@angular/core';

@Component({
  selector: 'app-ttlock',
  templateUrl: './ttlock.component.html',
  styleUrls: ['./ttlock.component.css']
})
export class TTLockComponent {

  returnLogged(): boolean {
    return sessionStorage.getItem('logged') === '1';
  }

}
