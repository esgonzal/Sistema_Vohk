import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;

  constructor() {
    this.socket = io('https://api.vohk.cl', {
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      console.log('🟢 Connected to socket:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('🔴 Disconnected from socket');
    });
  }

  onIntruderAlert(callback: (data: any) => void) {
    this.socket.on('intruder-alert', callback);
  }
}
