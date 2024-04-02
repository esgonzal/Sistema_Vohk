import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DarkModeService {
  darkMode: boolean =   localStorage.getItem('darkMode') === 'true';  ;

  constructor() { }

  setDarkMode(value: boolean) {
    this.darkMode = value  
  }

  getDarkMode(): boolean {
    return this.darkMode
  }
}
