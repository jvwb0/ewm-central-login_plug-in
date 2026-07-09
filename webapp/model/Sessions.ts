import type { PluginState } from "./Types";

export default class Sessions {
    saveSession(state: PluginState): void {
        const dataToStore = { state: state, savedAt: Date.now() };       // Bundle the state with a timestamp into one object
        const asString = JSON.stringify(dataToStore);                    // Convert the object to a string (localStorage only holds strings)
        localStorage.setItem("brown.centralewmlogin.session", asString); // Write it to browser storage under a key
    }

    loadSession(state: PluginState | null): void { }

    clearSession(): void {
        localStorage.removeItem("brown.centralewmlogin.session");
    }
}
