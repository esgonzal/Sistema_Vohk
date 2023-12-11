import { Card, Ekey, Fingerprint, Passcode, Record } from "./Elements";
import { GatewayAccount, GatewayLock } from "./Gateway";
import { Group } from "./Group";
import { LockData } from "./Lock";

export interface EkeyResponse {
    list: Ekey[];
    pageNo: number;
    pageSize: number;
    pages: number;
    total: number;
    errcode: number;
}
export interface PasscodeResponse {
    list: Passcode[];
    pageNo: number;
    pageSize: number;
    pages: number;
    total: number
}
export interface CardResponse {
    list: Card[];
    pageNo: number;
    pageSize: number;
    pages: number;
    total: number
}
export interface FingerprintResponse {
    list: Fingerprint[];
    pageNo: number;
    pageSize: number;
    pages: number;
    total: number
}
export interface RecordResponse {
    list: Record[];
    pageNo: number;
    pageSize: number;
    pages: number;
    total: number
}
export interface sendEkeyResponse {
    errcode: number;
    errmsg: string;
    description: string;
    keyId: number;
}
export interface createPasscodeResponse {
    errcode: number;
    errmsg: string;
    description: string;
    keyboardPwdId: number;
    keyboardPwd: string;
}
export interface operationResponse {
    errcode: number;
    errmsg: string;
    description: string;
}
export interface addGroupResponse {
    groupID: number;
    description: string;
    errcode: number;
    errmsg: string;
}
export interface GroupResponse {
    list: Group[];
}
export interface LockListResponse {
    list: LockData[];
    pageNo: number;
    pageSize: number;
    pages: number;
    total: number;
    errcode: number;
}
export interface GetAccessTokenResponse {
    errcode: number;
    errmsg: string;
    description: string;
    userID: string;
}
export interface ResetPasswordResponse {
    description: string;
    errcode: number;
    errmsg: string;
}
export interface UserRegisterResponse {
    description: string;
    errcode: number;
    errmsg: string;
    username: string;
}
export interface GatewayAccountResponse {
    list: GatewayAccount[];
    pageNo: number;
    pageSize: number;
    pages: number;
    total: number;
}
export interface GatewayLockResponse {
    list: GatewayLock[];
}
export interface GetLockTimeResponse {
    date: number;
    errcode: number;
    errmsg: string;
    description: string;
}
export interface checkUserInDBResponse {
    exists: boolean;
}
export interface getUserInDBResponse {
    accountname: string;
    originalusername: string;
    nickname: string;
    email: string;
    phone: string;
    password: string;
}
export interface getByUserAndLockIdResponse {
    accountname: string;
    lockid: number;
    isuser: boolean;
    message: string;
}
export interface logoutResponse {
    message: string;
}
