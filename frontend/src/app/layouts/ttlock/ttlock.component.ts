import { Component } from '@angular/core';

@Component({
  selector: 'app-ttlock',
  templateUrl: './ttlock.component.html',
  styleUrls: ['./ttlock.component.css']
})
export class TTLockComponent {

  returnLogged(): boolean {
    let log = sessionStorage.getItem('logged') === '1';
    return log
  }

}
