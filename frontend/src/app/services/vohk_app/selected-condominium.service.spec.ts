import { TestBed } from '@angular/core/testing';

import { SelectedCondominiumService } from './selected-condominium.service';

describe('SelectedCondominiumService', () => {
  let service: SelectedCondominiumService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SelectedCondominiumService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
