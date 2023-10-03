import { TestBed } from '@angular/core/testing';

import { PasscodeServiceService } from './passcode-service.service';

describe('PasscodeServiceService', () => {
  let service: PasscodeServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PasscodeServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
