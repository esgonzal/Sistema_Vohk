import { SelectedLock } from "./SelectedLock";

export interface CreateEkeyForm {
    receiver: string;
    name: string;
    type: string;
    startDate: string;
    endDate: string;
    remoteEnable: boolean;
    keyRight: boolean;
    notifyEmail: boolean;
    notificationEmail: string;
    locks: SelectedLock[];
}