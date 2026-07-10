export interface MultipleEkeyForm {
    type: '1' | '2';
    startDate: string;
    endDate: string;
    remoteEnable: boolean;
    keyRight: boolean;
    notifyEmail: boolean;
}