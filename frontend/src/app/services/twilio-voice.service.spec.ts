import { TestBed } from '@angular/core/testing';

import { TwilioVoiceService } from './twilio-voice.service';

describe('TwilioVoiceService', () => {
  let service: TwilioVoiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TwilioVoiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
