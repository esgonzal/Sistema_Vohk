import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Group } from '../Interfaces/Group';
import { LockData } from '../Interfaces/Lock';
import { operationResponse, GroupResponse, addGroupResponse } from '../Interfaces/API_responses';

@Injectable({
  providedIn: 'root'
})
export class GroupService {

  URL = 'https://api.vohkapp.com';
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
  getGroupofAccount(userID: string): Observable<GroupResponse> {
    let body = { userID };
    let url = this.URL.concat('/v0/group/getList');
    return this.http.post<GroupResponse>(url, body);
  }
  addGroup(userID: string, name: string): Observable<addGroupResponse> {
    let body = { userID, name };
    let url = this.URL.concat('/v0/group/add');
    return this.http.post<addGroupResponse>(url, body);
  }
  deleteGroup(userID: string, groupID: string): Observable<operationResponse> {
    let body = { userID, groupID };
    let url = this.URL.concat('/v0/group/delete');
    return this.http.post<operationResponse>(url, body);
  }
  renameGroup(userID: string, groupID: string, newName: string): Observable<operationResponse> {
    let body = { userID, groupID, newName };
    let url = this.URL.concat('/v0/group/rename');
    return this.http.post<operationResponse>(url, body);
  }
  setGroupofLock(userID: string, lockID: string, groupID: string): Observable<operationResponse> {
    let body = { userID, lockID, groupID };
    let url = this.URL.concat('/v0/group/setLock');
    return this.http.post<operationResponse>(url, body);
  }
}