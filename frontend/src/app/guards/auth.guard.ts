import { inject } from '@angular/core';
import { CanActivateFn, CanActivateChildFn, Router } from '@angular/router';
import { AuthService } from '../services/vohk_app/auth.service';

function checkAuth(url: string) {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? true : router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: url } });
}

export const authGuard: CanActivateFn = (_, state) => {
  return checkAuth(state.url);
};

export const authChildGuard: CanActivateChildFn = (_, state) => {
  return checkAuth(state.url);
};