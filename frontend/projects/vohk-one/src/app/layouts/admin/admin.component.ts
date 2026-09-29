import { Component, OnInit } from '@angular/core';
import { TwilioService } from '../../services/vohk_app/twilio.service';


@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {

  
  constructor(private twilioService: TwilioService) { }

  async ngOnInit(): Promise<void> {
    try {
      await this.twilioService.initialize();
    } catch (error) {
      console.error('Unable to initialize Twilio:', error);
    }
  }


}
