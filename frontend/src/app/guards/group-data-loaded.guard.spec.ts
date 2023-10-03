import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { groupDataLoadedGuard } from './group-data-loaded.guard';

describe('groupDataLoadedGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => groupDataLoadedGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
