import { TestBed } from '@angular/core/testing';

import { RecordServiceService } from './record-service.service';

describe('RecordServiceService', () => {
  let service: RecordServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RecordServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
