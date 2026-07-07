import type { Warehouse, WorkCenter, Resource, DefaultSetting } from "./Types";

// MockBackend simulates the future OData service using local JSON files.
// When the SAP backend is available, these methods can be replaced with OData calls
// without needing to change anything in the UI or Component.ts.

const BASE_PATH = sap.ui.require.toUrl("brown/centralewmlogin/mockdata");

async function loadJson<T>(filename: string): Promise<T> {
    const response = await fetch(`${BASE_PATH}/${filename}`);

    if (!response.ok) {
        throw new Error(`MockBackend: failed to load ${filename} (${response.status})`);
    }

    return response.json() as Promise<T>;
}

export async function loadWarehouses(): Promise<Warehouse[]> {
    return loadJson<Warehouse[]>("Warehouses.json");
}

export async function loadWorkCenters(): Promise<WorkCenter[]> {
    return loadJson<WorkCenter[]>("WorkCenters.json");
}

export async function loadResources(): Promise<Resource[]> {
    return loadJson<Resource[]>("Resources.json");
}

export async function loadDefaultSettings(): Promise<DefaultSetting[]> {
    return loadJson<DefaultSetting[]>("DefaultSettings.json");
}

// Returns only the work centers belonging to the given warehouse.
// Mirrors what a future $filter=warehouseNo eq '001' OData query would return.
export async function getWorkCentersForWarehouse(warehouseNo: string): Promise<WorkCenter[]> {
    const all = await loadWorkCenters();
    return all.filter(wc => wc.warehouseNo === warehouseNo);
}

// Returns only the resources belonging to the given warehouse.
// Mirrors what a future $filter=warehouseNo eq '001' OData query would return.
export async function getResourcesForWarehouse(warehouseNo: string): Promise<Resource[]> {
    const all = await loadResources();
    return all.filter(r => r.warehouseNo === warehouseNo);
}
