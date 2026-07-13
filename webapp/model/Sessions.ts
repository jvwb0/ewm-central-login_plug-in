import type { ActiveSession, UserSettings } from "./Types";

export default class Sessions {

    saveSession(state: ActiveSession): void {
        const dataToStore = { state: state, savedAt: Date.now() };       // Bundle the state with a timestamp into one object
        const asString = JSON.stringify(dataToStore);                    // Convert the object to a string (localStorage only holds strings)
        localStorage.setItem("brown.centralewmlogin.session", asString); // Write it to browser storage under a key
    }

    loadSession(): ActiveSession | null {
        const raw = localStorage.getItem("brown.centralewmlogin.session");
        if (!raw) {
            return null; // if null, undefined, "", 0, false, NaN 
        }
        try {
            const parsed = JSON.parse(raw) as { state: ActiveSession; savedAt: number }; // Parse the string back into an object
            if (Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000) { // If the saved session is older than 24 hours, discard it
                this.clearSession();
                return null;
            }

            return parsed.state;
        } catch (e) {
            this.clearSession(); // if JSON.parse fails, clear corrupt data & return null
            return null;
        }
    }

    clearSession(): void {
        localStorage.removeItem("brown.centralewmlogin.session");
    }

    // Saves the user's preferred warehouse/work center/resource with no expiry.
    // These are used to pre-fill the popover on future visits even after logout.
    saveSettings(settings: UserSettings): void {
        localStorage.setItem("brown.centralewmlogin.settings", JSON.stringify(settings));
    }

    // Returns saved preferences, or null if none have been saved yet.
    loadSettings(): UserSettings | null {
        const raw = localStorage.getItem("brown.centralewmlogin.settings");
        if (raw === null || raw === "") {
            return null;
        }
        try {
            return JSON.parse(raw) as UserSettings;
        } catch (e) {
            localStorage.removeItem("brown.centralewmlogin.settings"); // discard corrupt data
            return null;
        }
    }
}
