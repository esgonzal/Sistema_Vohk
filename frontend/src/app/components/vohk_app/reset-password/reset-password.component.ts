import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from 'src/app/services/vohk_app/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {

  token = '';
  password = '';
  confirmPassword = '';
  isLoading = false;
  completed = false;
  errorMessage = '';

  constructor(private route: ActivatedRoute, private userService: AuthService) { }

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.errorMessage = 'Token inválido.';
    }
  }

  async submitReset(): Promise<void> {
    this.errorMessage = '';
    if (!this.password || !this.confirmPassword) {
      this.errorMessage = 'Debe completar ambos campos.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }
    this.isLoading = true;
    try {
      await this.userService.resetPassword({ token: this.token, password: this.password });
      this.completed = true;
    } catch (error: any) {
      this.errorMessage = error?.error?.error ?? 'No se pudo cambiar la contraseña.';
    } finally {
      this.isLoading = false;
    }
  }
}