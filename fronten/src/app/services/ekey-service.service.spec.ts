import { TestBed } from '@angular/core/testing';

import { EkeyServiceService } from './ekey-service.service';

describe('EkeyServiceService', () => {
  let service: EkeyServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EkeyServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
