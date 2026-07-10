import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const protectedUrls = ['/app/auth', '/app/admin', '/app/device'];
    const shouldAttachToken = protectedUrls.some(url => req.url.includes(url));
    if (!shouldAttachToken) {
      return next.handle(req);
    }
    const token = localStorage.getItem('jwt');
    if (!token) {
      return next.handle(req);
    }
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next.handle(cloned);
  }

}