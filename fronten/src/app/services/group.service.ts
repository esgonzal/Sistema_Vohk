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

  DEFAULT_GROUP: Group = { groupId: 0, groupName: 'Todos', lockCount: 0, locks: [] };

  public selectedGroupSubject = new BehaviorSubject<Group>(this.DEFAULT_GROUP);
  selectedGroup$ = this.selectedGroupSubject.asObservable();

  token = sessionStorage.getItem('token') ?? '';
  groups: Group[] = [];
  locksWithoutGroup: LockData[];
  selectedGroup: Group;

  constructor(private http: HttpClient) { }

  updateSelectedGroup(group: Group) {
    this.selectedGroupSubject.next(group);
  }
  getGroupofAccount(token: string): Observable<GroupResponse> {
    let body = { token };
    let url = 'http://localhost:3000/api/ttlock/group/getList'
    return this.http.post<GroupResponse>(url, body);
  }
  addGroup(token: string, name: string): Observable<addGroupResponse> {
    let body = { token, name };
    let url = 'http://localhost:3000/api/ttlock/group/add';
    return this.http.post<addGroupResponse>(url, body);
  }
  deleteGroup(token: string, groupID: string): Observable<operationResponse> {
    let body = { token, groupID };
    let url = 'http://localhost:3000/api/ttlock/group/delete';
    return this.http.post<operationResponse>(url, body);
  }
  renameGroup(token: string, groupID: string, newName: string): Observable<operationResponse> {
    let body = { token, groupID, newName };
    let url = 'http://localhost:3000/api/ttlock/group/rename';
    return this.http.post<operationResponse>(url, body);
  }
  setGroupofLock(token: string, lockID: string, groupID: string): Observable<operationResponse> {
    let body = { token, lockID, groupID };
    let url = 'http://localhost:3000/api/ttlock/group/setLock';
    return this.http.post<operationResponse>(url, body);
  }
}
