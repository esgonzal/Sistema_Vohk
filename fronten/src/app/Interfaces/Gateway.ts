export interface GatewayLock {
    gatewayId: number;
    gatewayMac: string;
    gatewayName: string;
    rssi: number;
    rssiUpdateDate: string;
}
export interface GatewayAccount {
    gatewayId: number;
    gatewayMac: string;
    gatewayName: string;
    gatewayVersion: string;
    isOnline: number;
    lockNum: number;
    networkName: string;
    networkMac: string;
    serialNumber: string;
}