import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { cameraFeedResponse } from '../Interfaces/API_responses';

@Injectable({
  providedIn: 'root',
})
export class CameraService {
  URL = 'https://api.vohkapp.com';

  constructor(private http: HttpClient) {}

  startLiveStream(ipAddress: string, devIndex: string): Observable<cameraFeedResponse> {
    let body = { ipAddress, devIndex};
    let url = this.URL.concat('/startLiveStream');
    return this.http.post<cameraFeedResponse>(url, body);
  }

  stopLiveStream(): Observable<cameraFeedResponse> {
    let url = this.URL.concat('/stopLiveStream');
    return this.http.post<cameraFeedResponse>(url, {});
  }
}