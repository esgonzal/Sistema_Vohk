import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  private readonly publicEndpoints = ['/api/auth/login', '/api/auth/reset-password'];

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const isPublicEndpoint = this.publicEndpoints.some(endpoint => req.url.includes(endpoint));
    if (isPublicEndpoint) {
      return next.handle(req);
    }
    const token = localStorage.getItem('jwt');
    if (!token) {
      return next.handle(req);
    }
    return next.handle(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }
}