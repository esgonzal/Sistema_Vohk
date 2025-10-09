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
    total: number;
    errcode: number;
}
export interface CardResponse {
    list: Card[];
    pageNo: number;
    pageSize: number;
    pages: number;
    total: number;
    errcode: number;
}
export interface FingerprintResponse {
    list: Fingerprint[];
    pageNo: number;
    pageSize: number;
    pages: number;
    total: number;
    errcode: number;
}
export interface RecordResponse {
    list: Record[];
    pageNo: number;
    pageSize: number;
    pages: number;
    total: number;
    errcode: number;
}
export interface sendEkeyResponse {
    errcode: number;
    errmsg: string;
    description: string;
    keyId: number;
    emailContent: string;
    toEmail: string;
    success: boolean;
}
export interface createPasscodeResponse {
    errcode: number;
    errmsg: string;
    description: string;
    keyboardPwdId: number;
    keyboardPwd: string;
}
// Individual lock result
export interface LockResult {
  lockID: number;
  lockAlias: string;
  passcodePwd?: string; // present if success
  success: boolean;
  errcode?: number | string; // present if success === false
}
// Email info
export interface EmailResult {
  emailContent: string;
  emailSent: boolean;
  emailError?: string; // present if sending failed
}
// Full invitation response
export interface InvitationResponse {
  locks: LockResult[];
  email?: EmailResult;
}
export interface addCardResponse {
    errcode: number;
    errmsg: string;
    description: string;
    cardId: number;
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
    errcode: number;
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
    errcode: number;
}
export interface GatewayLockResponse {
    list: GatewayLock[];
    errcode: number;
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
export interface cameraFeedResponse {
    success: boolean;
    streamUrl: string;
    message: string;
    error: string;
}

export interface MultiplePasscodeResponse {
    lockId: number;
    lockAlias: string;
    passcodes: PasscodeResult[];
}

export interface PasscodeResult {
    passcodeName: string;
    tipo: number;
    code?: string;
    codeId?: number;
    result: string;
    errcode: number;
    errmsg?: string;
}
