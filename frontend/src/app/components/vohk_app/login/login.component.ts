import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/vohk_app/auth.service';
import { TwilioService } from 'src/app/services/vohk_app/twilio.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  username = '';
  password = '';
  error = '';
  isLoading = false;

  constructor(private authService: AuthService, private router: Router, private twilioService: TwilioService,) { }

  login() {
    this.isLoading = true;
    this.error = '';
    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err?.error?.error || 'Login failed';
      },
    });
  }
}
