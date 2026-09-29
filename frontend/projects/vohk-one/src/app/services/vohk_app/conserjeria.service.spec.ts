import { TestBed } from '@angular/core/testing';

import { ConserjeriaService } from './conserjeria.service';

describe('ConserjeriaService', () => {
  let service: ConserjeriaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConserjeriaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
