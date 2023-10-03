import { LockData } from "./Lock";

export interface Group {
    groupId: number,
    groupName: string
    lockCount: number;
    locks: LockData[]
}
