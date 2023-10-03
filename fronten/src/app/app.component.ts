import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'vohk';

  constructor() { }

  returnLogged() {
    return sessionStorage.getItem('logged') ?? '';
  }

}
