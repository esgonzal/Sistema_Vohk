/// <reference types="hls.js" />
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
    //this.startFfmpegProcess();
  }

  ngAfterViewInit(): void {
    this.videoPlayer = this.videoPlayerRef.nativeElement;
    this.setupVideoPlayer();
  }


  setupVideoPlayer(): void {
    const videoSrc = 'https://wework-7-us.stream.iot-11.com:8080/hls/eb97e8f1fad554a965cbkg/cqlpaq0d9fpnce9vtklgH4JFEyfaeddt8bx3bkn8.m3u8?signInfo=JpK90w7s_wkldyPh9Xg8tKVpNuNR47gkapbNdIpYzRhRUSppolDpiv4fXLDeFvv_CNzt6I1n51ijSEQOYsY-G0yNf2lCbRznuSrtCDk96f1ZhJGwNiKbAy7ARLO5i70KsbzsXY1tZ57TmR5g6ZMgZRIMwMVpyi6H1M_ezdDun8A';
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(videoSrc);
      hls.attachMedia(this.videoPlayer);
    } else if (this.videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
      this.videoPlayer.src = videoSrc;
    }
  }
}