import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-invitation',
  templateUrl: './invitation.component.html',
  styleUrls: ['./invitation.component.css']
})
export class InvitationComponent implements OnInit {

  isLoading: boolean = false;
  registrationCompleted = false;
  invitationId = '';
  invitation: any = null;
  dynamicCode = '';
  visitor = {
    name: '',
    email: '',
    phone: '',
    vehiclePlate: ''
  };
  selectedPhoto: File | null = null;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.invitationId = this.route.snapshot.paramMap.get('id') || '';
    this.loadInvitation();
  }

  loadInvitation() {
    this.isLoading = true;
    this.http.get(`https://api.vohk.cl/app/device/invitations/${this.invitationId}`).subscribe({
      next: (response: any) => {
        this.invitation = response;
        this.isLoading = false;
      },
      error: (error) => {
        console.error(error);
        this.isLoading = false;
      }
    });
  }

  submitInvitation() {
    this.errorMessage = '';
    this.isLoading = true;
    const formData = new FormData();
    formData.append('name', this.visitor.name);
    formData.append('email', this.visitor.email);
    formData.append('phone', this.visitor.phone);
    formData.append('vehiclePlate', this.visitor.vehiclePlate);
    if (this.selectedPhoto) {
      formData.append('photo', this.selectedPhoto);
    }
    this.http.post<any>(
      `https://api.vohk.cl/app/device/invitations/${this.invitationId}/register`,
      formData
    ).subscribe({
      next: response => {
        this.dynamicCode = response.dynamicCode;
        this.registrationCompleted = true;
        this.isLoading = false;
      },
      error: error => {
        console.error(error);
        this.errorMessage =
          error?.error?.message ||
          error?.error?.error ||
          error?.message ||
          JSON.stringify(error);
        this.isLoading = false;
      }
    });
  }

  onPhotoSelected(event: any) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    this.selectedPhoto = file;
  }

}