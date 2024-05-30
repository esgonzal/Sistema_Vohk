export interface PassageMode {
    autoUnlock: number;
    endDate: string;
    isAllDay: number;
    passageMode: number;
    startDate: string;
    weekDays: number[];
    errcode: number;
    cyclicConfig: {
        isAllDay: number;
        startTime: number; // Assuming startTime is in minutes format
        endTime: number; // Assuming endTime is in minutes format
        weekDays: number[];
    }[];
}