import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Group } from '../Interfaces/Group';
import { LockData } from '../Interfaces/Lock';
import { operationResponse, GroupResponse, addGroupResponse } from '../Interfaces/API_responses';

@Injectable({
  providedIn: 'root'
})
export class GroupService {

  URL = 'https://api.vohk.cl';
  //URL = 'http://localhost:8080';
  DEFAULT_GROUP: Group = { groupId: 0, groupName: 'Todos', lockCount: 0, locks: [] };

  public selectedGroupSubject = new BehaviorSubject<Group>(this.DEFAULT_GROUP);
  selectedGroup$ = this.selectedGroupSubject.asObservable();

  groups: Group[] = [];
  locksWithoutGroup: LockData[];
  selectedGroup: Group;

  constructor(private http: HttpClient) { }

  updateSelectedGroup(group: Group) {
    this.selectedGroupSubject.next(group);
  }
  private getHeaders(accessToken: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${accessToken}` });
  }

  getGroupofAccount(accessToken: string): Observable<GroupResponse> {
    const url = this.URL.concat('/v0/group/list');
    return this.http.get<GroupResponse>(url, { headers: this.getHeaders(accessToken) });
  }
  addGroup(accessToken: string, name: string): Observable<addGroupResponse> {
    const url = this.URL.concat('/v0/group/add');
    const body = { name };
    return this.http.post<addGroupResponse>(url, body, { headers: this.getHeaders(accessToken) });
  }
  deleteGroup(accessToken: string, groupID: string): Observable<operationResponse> {
    const url = this.URL.concat('/v0/group/delete');
    const body = { groupID };
    return this.http.post<operationResponse>(url, body, { headers: this.getHeaders(accessToken) });
  }
  renameGroup(accessToken: string, groupID: string, newName: string): Observable<operationResponse> {
    const url = this.URL.concat('/v0/group/rename');
    const body = { groupID, newName };
    return this.http.post<operationResponse>(url, body, { headers: this.getHeaders(accessToken) });
  }
  setGroupofLock(accessToken: string, lockID: string, groupID: string): Observable<operationResponse> {
    const url = this.URL.concat('/v0/group/setLock');
    const body = { lockID, groupID };
    return this.http.post<operationResponse>(url, body, { headers: this.getHeaders(accessToken) });
  }
  fetchAll(accessToken: string): Observable<GroupResponse> {
    const url = this.URL.concat('/v0/group/fetchAll');
    return this.http.get<GroupResponse>(url, { headers: this.getHeaders(accessToken) });
  }
}