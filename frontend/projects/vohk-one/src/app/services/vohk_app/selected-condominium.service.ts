import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface SelectedCondominium {
  condominium_id: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class SelectedCondominiumService {

  private readonly STORAGE_KEY = 'selectedCondominiumId';
  private selectedSubject = new BehaviorSubject<SelectedCondominium | null>(null);
  readonly selected$: Observable<SelectedCondominium | null> = this.selectedSubject.asObservable();

  constructor() { }

  getSelected(): SelectedCondominium | null {
    return this.selectedSubject.value;
  }
  getSelectedId(): string | null {
    return this.selectedSubject.value?.condominium_id ?? null;
  }
  setSelected(condominium: SelectedCondominium): void {
    this.selectedSubject.next(condominium);
    localStorage.setItem(this.STORAGE_KEY, condominium.condominium_id);
  }
  clear(): void {
    this.selectedSubject.next(null);
    localStorage.removeItem(this.STORAGE_KEY);
  }
  getStoredId(): string | null {
    return localStorage.getItem(this.STORAGE_KEY);
  }
  restoreFromList(condominiums: SelectedCondominium[]): SelectedCondominium | null {
    if (!condominiums.length) {
      this.clear();
      return null;
    }
    const storedId = this.getStoredId();
    let selected = condominiums.find(c => c.condominium_id === storedId) ?? null
    if (!selected) {
      selected = condominiums[0];
      this.setSelected(selected);
    } else {
      this.selectedSubject.next(selected);
    }
    return selected;
  }
}
