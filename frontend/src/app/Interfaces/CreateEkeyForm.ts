import { SelectedLock } from "./SelectedLock";

export interface CreateEkeyForm {
    receiver: string;
    name: string;
    type: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    remoteEnable: boolean;
    keyRight: boolean;
    notifyEmail: boolean;
    notificationEmail: string;
    locks: SelectedLock[];
}