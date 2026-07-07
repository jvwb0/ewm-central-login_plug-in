// Matches the future OData entity: ZEWM_CENTRAL_LOGIN_C_WAREHOUSE
export interface Warehouse {
    warehouseNo: string;
    description: string;
}

// Matches the future OData entity: ZEWM_CENTRAL_LOGIN_C_WC
export interface WorkCenter {
    warehouseNo: string;
    workCenterId: string;
    description: string;
}

// Matches the future OData entity: ZEWM_CENTRAL_LOGIN_C_RESOURCE
export interface Resource {
    warehouseNo: string;
    workCenterId: string;
    resourceId: string;
    description: string;
}

// Matches the future OData entity: DefaultSettings
export interface DefaultSetting {
    warehouseNo: string;
    workCenterId: string;
    resourceId: string;
}

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