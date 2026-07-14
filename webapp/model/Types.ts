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

// The committed login session - written on Login, read on app start to restore state.
export interface ActiveSession {
    isLoggedIn: boolean;
    warehouseNo: string;
    workCenterId: string;
    resourceId: string;
    timestamp?: number;
}

// Permanent user preferences - written by Save button, never expire.
// Used to pre-fill the popover even when no active session exists.
export interface UserSettings {
    warehouseNo: string;
    workCenterId: string;
    resourceId: string;
}

// The user's current edits in the popover - separate from the committed session so Cancel works.
export interface LoginDraft {
    warehouseNo: string;
    workCenterId: string;
    resourceId: string;
    showUpdateButton: boolean;
}