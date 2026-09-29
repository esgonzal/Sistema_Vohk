import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PublicInvitation {
  invitation_id: string;
  type: string;
  status: string;
  valid_from: string;
  valid_until: string;
}

export interface VisitorRegistration {
  name: string;
  email: string;
  phone: string;
  vehiclePlate: string;
}

export interface VisitorRegistrationResponse {
  success: boolean;
  dynamicCode: string;
}

@Injectable({
  providedIn: 'root'
})
export class InvitationService {

  URL = 'https://api.vohk.cl';
  //URL = 'http://localhost:8080';

  constructor(private http: HttpClient) { }

  getPublicInvitation(invitationId: string): Observable<PublicInvitation> {
    return this.http.get<PublicInvitation>(`${this.URL}/api/invitation/${invitationId}/public`);
  }

  registerVisitor(invitationId: string, visitor: VisitorRegistration, photo: File | null): Observable<VisitorRegistrationResponse> {
    const formData = new FormData();
    formData.append('name', visitor.name);
    formData.append('email', visitor.email);
    formData.append('phone', visitor.phone);
    formData.append('vehiclePlate', visitor.vehiclePlate);
    if (photo) {
      formData.append('photo', photo);
    }
    return this.http.post<VisitorRegistrationResponse>(`${this.URL}/api/invitation/${invitationId}/register`, formData);
  }
}