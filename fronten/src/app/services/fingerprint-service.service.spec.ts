import { TestBed } from '@angular/core/testing';

import { FingerprintServiceService } from './fingerprint-service.service';

describe('FingerprintServiceService', () => {
  let service: FingerprintServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FingerprintServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
