import { TestBed } from '@angular/core/testing';

import { PassageModeService } from './passage-mode.service';

describe('PassageModeService', () => {
  let service: PassageModeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PassageModeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
