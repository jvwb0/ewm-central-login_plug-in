export interface PluginState {
    isLoggedIn: boolean;
    warehouseNo: string;
    workCenterId: string;
    resourceId: string;
    timestamp?: number;
}

export interface PopoverState {
    warehouseNo: string;
    workCenterId: string;
    resourceId: string;
    showUpdateButton: boolean;
}