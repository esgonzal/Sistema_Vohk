import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { InvitationService } from 'src/app/services/vohk_app/invitation.service';

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
  visitor = { name: '', email: '', phone: '', vehiclePlate: '' };
  selectedPhoto: File | null = null;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private invitationService: InvitationService
  ) { }

  ngOnInit(): void {
    this.invitationId = this.route.snapshot.paramMap.get('id') || '';
    this.loadInvitation();
  }

  loadInvitation() {
    this.isLoading = true;
    this.errorMessage = '';
    this.invitationService.getPublicInvitation(this.invitationId).subscribe({
      next: invitation => {
        this.invitation = invitation;
        console.log(this.invitation);
        this.isLoading = false;
      },
      error: error => {
        console.error(error);
        this.errorMessage =
          error?.error?.error ||
          error?.message ||
          'No se pudo cargar la invitación.';
        this.isLoading = false;
      }
    });
  }

  submitInvitation() {
    this.errorMessage = '';
    this.isLoading = true;
    this.invitationService.registerVisitor(this.invitationId, this.visitor, this.selectedPhoto).subscribe({
      next: response => {
        this.dynamicCode = response.dynamicCode;
        this.registrationCompleted = true;
        this.isLoading = false;
      },
      error: error => {
        console.error(error);
        this.errorMessage =
          error?.error?.error ||
          error?.message ||
          'No se pudo registrar la visita.';
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