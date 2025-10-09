import { Component, AfterViewInit } from '@angular/core';

declare var JSPlugin: any;

@Component({
  selector: 'app-camera',
  templateUrl: './camera.component.html',
  styleUrls: ['./camera.component.css']
})
export class CameraComponent implements AfterViewInit {

  userID = sessionStorage.getItem('user') ?? '';
  accessToken = 'at.5899a83gddf8kiir2zrgrhnt5ihdni1v-4g4vmydfqx-19g5hwu-lwgmxsez7';
  secretKey = 'vohk2024';
  cameraSerial = 'FQ9225668';
  cameraChannel = '1';
  intercomSerial = 'FH4143313';
  intercomChannel = '1';
  domain = 'https://isaopen.ezvizlife.com';

  cameraPlugin: any;
  intercomPlugin: any;

  realplayFinished = true;

  constructor() { }

  ngAfterViewInit(): void {
    this.initCameraPlugin();
    this.initIntercomPlugin();
  }

  initCameraPlugin() {
    this.cameraPlugin = new JSPlugin({
      szId: 'cameraPlay',
      iWidth: 600,
      iHeight: 300,
      iMaxSplit: 1,
      iCurrentSplit: 1,
      szBasePath: 'assets/hik-sdk/dist',
    });
  }

  initIntercomPlugin() {
    this.intercomPlugin = new JSPlugin({
      szId: 'intercomPlay',
      iWidth: 600,
      iHeight: 300,
      iMaxSplit: 1,
      iCurrentSplit: 1,
      szBasePath: 'assets/hik-sdk/dist',
    });
  }

  startCameraFeed() {
    if (!this.realplayFinished) return;
    if (this.userID != 'soporte@vohk.cl') return;
    this.realplayFinished = false;
    const url = `ezopen://open.ezviz.com/${this.cameraSerial}/${this.cameraChannel}.live`;

    if (this.secretKey) {
      this.cameraPlugin.JS_SetSecretKey(0, this.secretKey);
    }

    this.cameraPlugin.JS_Play(url, {
      playURL: url,
      ezuikit: true,
      env: { domain: this.domain },
      accessToken: this.accessToken,
      mode: 'media'
    }, 0).then(() => this.realplayFinished = true)
      .catch(() => this.realplayFinished = true);
  }

  stopCameraFeed() {
    if (this.cameraPlugin) this.cameraPlugin.JS_Stop(0);
  }

  startIntercomFeed() {
    if (!this.realplayFinished) return;
    if (this.userID != 'soporte@vohk.cl') return;
    this.realplayFinished = false;
    const url = `ezopen://open.ezviz.com/${this.intercomSerial}/${this.intercomChannel}.live`;

    if (this.secretKey) {
      this.intercomPlugin.JS_SetSecretKey(0, this.secretKey);
    }

    this.intercomPlugin.JS_Play(url, {
      playURL: url,
      ezuikit: true,
      env: { domain: this.domain },
      accessToken: this.accessToken,
      mode: 'media'
    }, 0).then(() => this.realplayFinished = true)
      .catch(() => this.realplayFinished = true);
  }

  stopIntercomFeed() {
    if (this.intercomPlugin) this.intercomPlugin.JS_Stop(0);
  }

  startTalk() {
    if (!this.intercomPlugin) return;
    if (this.userID != 'soporte@vohk.cl') return;

    const oParams = {
      accessToken: this.accessToken,
      channelNo: this.intercomChannel,
      deviceSerial: this.intercomSerial,
      env: {
        domain: this.domain
      }
    };

    this.intercomPlugin.JS_StartEZUITalk(oParams, (info: any) => {
      console.log('Talk callback info', info);
    }).then(() => {
      console.log('startTalk success');
    }).catch(() => {
      console.log('startTalk failed');
    });
  }

  stopTalk() {
    if (!this.intercomPlugin) return;

    this.intercomPlugin.JS_StopEZUITalk()
      .then(() => console.log('stopTalk success'))
      .catch(() => console.log('stopTalk failed'));
  }


}