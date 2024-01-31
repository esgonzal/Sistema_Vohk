import { Component, OnInit } from '@angular/core';
import { CameraService } from '../../services/camera.service';
import { cameraFeedResponse } from 'src/app/Interfaces/API_responses';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-camera-stream',
  templateUrl: './camera-stream.component.html',
  styleUrls: ['./camera-stream.component.css']
})
export class CameraStreamComponent implements OnInit {

  streamUrl: string;

  constructor(private cameraService: CameraService) {}

  ngOnInit(): void {
    this.startLiveStream();
  }

  async startLiveStream(): Promise<void> {
    const ipAddress = 'your-camera-ip';
    const devIndex = 'your-camera-dev-index';
    let response = await lastValueFrom(this.cameraService.startLiveStream(ipAddress, devIndex)) as cameraFeedResponse;
    if (response.success){
      this.streamUrl = "ws://api.vohkapp.com:9999";
    } else {
      console.error('Error starting live stream:', response.error);
    }
  }

  async stopLiveStream(): Promise<void> {
    let response = await lastValueFrom(this.cameraService.stopLiveStream()) as cameraFeedResponse;
    if (response.success) {
      console.log("stream detenido correctamente");
    } else {
      console.error('Error stopping live stream:', response.error);
    }
  }
}
