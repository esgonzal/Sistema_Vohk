import { Component, OnInit } from '@angular/core';
import { SocketService } from './services/socket.service';
import { TwilioVoiceService } from './services/twilio-voice.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'vohk';

  constructor(private socketService: SocketService, private twilioVoice: TwilioVoiceService) { }

  ngOnInit() {
    this.twilioVoice.inicializar();
    this.socketService.onIntruderAlert((data) => {
      console.log('🚨 ALERT:', data);
      // temporary, you’ll replace this later
      //alert('Intruder detected!');
    });
  }

  returnLogged() {
    return sessionStorage.getItem('logged') ?? '';
  }

}
