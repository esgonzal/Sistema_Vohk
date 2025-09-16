import { Component, OnInit, AfterViewInit } from '@angular/core';

declare var JSPlugin: any;

@Component({
  selector: 'app-camera',
  templateUrl: './camera.component.html',
  styleUrls: ['./camera.component.css']
})
export class CameraComponent implements OnInit, AfterViewInit {

  // Plugin instance
  oPlugin: any;
  iWind = 0;
  realplayFinished = true;

  // Bindings for inputs
  accessToken: string = '';
  secretKey: string = '';
  serialNumber: string = '';
  channelNumber: string = '';
  videoResolution: string = '';
  domainValue: string = '';

  oTimeBar: any = null;           // TimeBar instance
  fileListMap: { [key: number]: any[] } = {}; // Map window index → file list
  errorMessage: string = '';
  volume:any;
  eDate: any;
  sDate: any;
  storageType: any;

  constructor() { }

  ngOnInit(): void { }

  ngAfterViewInit(): void {
    this.oPlugin = new JSPlugin({
      szId: 'playWind',
      iWidth: 600,
      iHeight: 400,
      iMaxSplit: 4,
      iCurrentSplit: 2,
      szBasePath: 'assets/hik-sdk/dist', // points to your copied dist folder
      oStyle: {
        border: '#343434',
        borderSelect: 'red',
        background: '#4C4B4B'
      }
    });

    this.initPlugin();
  }

  repaintTimeBar(iWndIndex: number) {
    if (!this.oTimeBar) return;

    // Clear existing files
    this.oTimeBar.clearWndFileList();

    // Get files for the selected window
    const fileList = this.fileListMap[iWndIndex];
    if (fileList) {
      fileList.forEach(file => {
        this.oTimeBar.addFile(file.start, file.end, file.type);
      });
    } else {
      console.log('fileList is null for window', iWndIndex);
    }

    // Repaint the timeBar
    this.oTimeBar.repaint();
  }

  initPlugin() {
    if (!this.oPlugin) return;

    this.oPlugin.JS_SetWindowControlCallback({
      windowEventSelect: (iWndIndex: number) => {
        // When a window is selected, repaint the timeBar if needed
        if (this.iWind !== iWndIndex) {
          this.repaintTimeBar(iWndIndex); // you'll need to implement this in Angular
        }
        this.iWind = iWndIndex;
        console.log('Selected window:', iWndIndex);
      },
      secretKeyError: (iWndIndex: number) => {
        console.log('Secret Key Error!', iWndIndex);
      },
      pluginErrorHandler: (iWndIndex: number, iErrorCode: number, oError: any) => {
        console.log('Plugin error', iWndIndex, iErrorCode, oError);
      },
      windowEventOver: (iWndIndex: number) => { /* optional */ },
      windowEventOut: (iWndIndex: number) => { /* optional */ },
      windowEventUp: (iWndIndex: number) => { /* optional */ },
      windowFullCcreenChange: (bFull: boolean) => { /* optional */ },
      firstFrameCallBack: (iWndIndex: number) => {
        console.log('First frame displayed:', iWndIndex);
      },
      performanceLack: () => { console.warn('Plugin performance lack'); }
    });
  }

  // Start live view
  realplay() {
    if (!this.realplayFinished) return;

    if (!this.serialNumber || !this.channelNumber || !this.accessToken) return;

    let url = `ezopen://open.ezviz.com/${this.serialNumber}/${this.channelNumber}`;
    if (this.videoResolution === 'hd') {
      url += '.hd.live';
    } else {
      url += '.live';
    }

    if (this.secretKey) {
      this.oPlugin.JS_SetSecretKey(this.iWind, this.secretKey)
        .then(() => console.log('JS_SetSecretKey success'))
        .catch(() => console.log('JS_SetSecretKey failed'));
    }

    this.realplayFinished = false;

    this.oPlugin.JS_Play(url, {
      playURL: url,
      ezuikit: true,
      env: { domain: this.domainValue },
      accessToken: this.accessToken,
      mode: 'media'
    }, this.iWind).then(() => {
      this.realplayFinished = true;
      console.log('realplay success');
    }).catch(() => {
      this.realplayFinished = true;
      console.log('realplay failed');
    });
  }

  // Stop live view
  stop() {
    this.oPlugin.JS_Stop(this.iWind)
      .then(() => console.log('stop success'))
      .catch(() => console.log('stop failed'));
  }

  destroy() {}
  fullScreenAll(){}
  fullScreenSingle(){}
  arrangeWindow(number: number){}
  closeSound(){}
  setVolume(){}
  getVolume(){}
  openSound(){}
  slow(){}
  fast(){}
  stopPlayback(){}
  resume(){}
  pause(){}
  playback(){}
  stopTalk(){}
  startTalk(){}
  selectWindow(){}
  stopAll(){}
  capturePicture(JPEG: string){}
  stopRecord(){}
  startRecord(){}
  getOSDTime(){}
}
