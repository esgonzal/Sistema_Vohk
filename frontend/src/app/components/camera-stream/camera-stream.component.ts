import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import Hls from 'hls.js';

@Component({
  selector: 'app-camera-stream',
  templateUrl: './camera-stream.component.html',
  styleUrls: ['./camera-stream.component.css']
})
export class CameraStreamComponent implements AfterViewInit, OnInit {
  @ViewChild('videoPlayer') videoPlayerRef: ElementRef<HTMLVideoElement>;
  videoPlayer: HTMLVideoElement;
  subscription: Subscription;
  isStreaming: boolean = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.startFfmpegProcess();
  }

  ngAfterViewInit(): void {
    this.videoPlayer = this.videoPlayerRef.nativeElement;
    this.setupVideoPlayer();
  }

  startFfmpegProcess(): void {
    this.http.get('http://localhost:3000/start-ffmpeg').subscribe(
      () => {
        console.log('FFmpeg process started successfully');
      },
      (error) => {
        console.error('Error starting FFmpeg process:', error);
      }
    );
  }

  setupVideoPlayer(): void {
    const videoSrc = 'http://localhost:3000/stream/index.m3u8';
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(videoSrc);
      hls.attachMedia(this.videoPlayer);
    } else if (this.videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
      this.videoPlayer.src = videoSrc;
    }
  }
}