import BaseComponent from "sap/ui/core/UIComponent";
import Fragment from "sap/ui/core/Fragment";
import Popover from "sap/m/Popover";
import Event from "sap/ui/base/Event";
import Control from "sap/ui/core/Control";
import JSONModel from "sap/ui/model/json/JSONModel";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import ListBinding from "sap/ui/model/ListBinding";
import ComboBox from "sap/m/ComboBox";
import { createDeviceModel } from "./model/models";
import type { LoginDraft, ActiveSession, UserSettings } from "./model/Types";
import Sessions from "./model/Sessions";
import MessageToast from "sap/m/MessageToast";

// Minimal type for the FLP shell renderer. Only typing what we actually use.
type ShellRenderer = {
    addHeaderEndItem: (
        properties: Record<string, unknown>,
        isVisible: boolean,
        isCurrentState: boolean
    ) => void;
};

const POPOVER_FRAGMENT_NAME = "brown.centralewmlogin.fragments.CentralLoginPopover";

/**
 * @namespace brown.centralewmlogin
 */
export default class Component extends BaseComponent {

    // --- Fields -----------------------------------------------------------------

    private loginPopover: Popover | undefined;  // Cached popover, loaded once and reused.
    private headerButtonAdded = false;          // Prevents adding the header button twice.
    private sessions!: Sessions;                // Initialized at the start of init() - UI5 calls init() before class fields are set.

    public static metadata = { manifest: "json", interfaces: ["sap.ui.core.IAsyncContentCreation"] };

    // --- Lifecycle --------------------------------------------------------------

    public init(): void {
        super.init();
        this.sessions = new Sessions(); // Must be first - UI5 calls init() before class field initializers run.
        this.setModel(createDeviceModel(), "device");
        const savedSession = this.sessions.loadSession();

        // Initialize the active session model. If a saved session exists, use it; otherwise, create a new default session.
        let activeSession: ActiveSession;
        if (savedSession !== null) {
            activeSession = savedSession;
        } else {
            activeSession = { isLoggedIn: false, warehouseNo: "", workCenterId: "", resourceId: "" };
        }
        const activeSessionModel = new JSONModel(activeSession);
        this.setModel(activeSessionModel, "activeSession");

        // Initialize the login draft model.
        // Priority: active session > saved settings > empty defaults.
        let loginDraft: LoginDraft;
        if (activeSession.isLoggedIn) {
            loginDraft = { warehouseNo: activeSession.warehouseNo, workCenterId: activeSession.workCenterId, resourceId: activeSession.resourceId, showUpdateButton: false };
        } else {
            const savedSettings = this.sessions.loadSettings();
            if (savedSettings !== null) {
                loginDraft = { warehouseNo: savedSettings.warehouseNo, workCenterId: savedSettings.workCenterId, resourceId: savedSettings.resourceId, showUpdateButton: false };
            } else {
                loginDraft = { warehouseNo: "", workCenterId: "", resourceId: "", showUpdateButton: false };
            }
        }
        const loginDraftModel = new JSONModel(loginDraft);
        loginDraftModel.setDefaultBindingMode("TwoWay"); // TwoWay: ComboBox changes update the model automatically.
        this.setModel(loginDraftModel, "loginDraft");
        this.getRouter().initialize();
        this.registerHeaderLoginButton();
    }

    // --- Event Handlers ---------------------------------------------------------

    public async onOpenLoginPress(oEvent: Event): Promise<void> {
        const loginPopover = await this.getOrCreateLoginPopover();
        const source = oEvent.getSource() as Control | { getDomRef?: () => HTMLElement | null }; // Shell items are not always UI5 Controls.
        const opener = source instanceof Control ? source : source.getDomRef?.();
        if (!loginPopover || !opener) { return; }
        loginPopover.openBy(opener);
    }

    public onWarehouseChanged(oEvent: Event): void {
        const selectedWarehouseNo = (oEvent.getSource() as ComboBox).getSelectedKey();
        const fragmentId = this.createId("centralLoginPopover");
        const workCenterCombo = Fragment.byId(fragmentId, "workCenterSelect") as ComboBox | undefined;
        const resourceCombo = Fragment.byId(fragmentId, "resourceSelect") as ComboBox | undefined;

        if (selectedWarehouseNo) {
            const filter = new Filter("warehouseNo", FilterOperator.EQ, selectedWarehouseNo);
            (workCenterCombo?.getBinding("items") as ListBinding | undefined)?.filter([filter]);
            (resourceCombo?.getBinding("items") as ListBinding | undefined)?.filter([filter]);
        } else {
            (workCenterCombo?.getBinding("items") as ListBinding | undefined)?.filter([]); // No warehouse: show all.
            (resourceCombo?.getBinding("items") as ListBinding | undefined)?.filter([]);
        }

        const loginDraft = this.getModel("loginDraft") as JSONModel;
        loginDraft.setProperty("/workCenterId", ""); // Dependent selections are no longer valid.
        loginDraft.setProperty("/resourceId", "");
    }

    public onLoginPress(): void {
        const loginDraft = this.getModel("loginDraft") as JSONModel;
        const activeSession = this.getModel("activeSession") as JSONModel;

        // Update the active session with the values from the draft.
        activeSession.setProperty("/isLoggedIn", true);
        activeSession.setProperty("/warehouseNo", loginDraft.getProperty("/warehouseNo"));
        activeSession.setProperty("/workCenterId", loginDraft.getProperty("/workCenterId"));
        activeSession.setProperty("/resourceId", loginDraft.getProperty("/resourceId"));

        // Save the active session to localStorage.
        this.sessions.saveSession(activeSession.getData());

        // Also persist the selected values as permanent preferences for future visits.
        const settings: UserSettings = { warehouseNo: loginDraft.getProperty("/warehouseNo"), workCenterId: loginDraft.getProperty("/workCenterId"), resourceId: loginDraft.getProperty("/resourceId") };
        this.sessions.saveSettings(settings);

        MessageToast.show("Login successful");
        this.loginPopover?.close();
    }

    public onLogoutPress(): void {
        const activeSession = this.getModel("activeSession") as JSONModel;

        // Clear the active session.
        activeSession.setProperty("/isLoggedIn", false);
        activeSession.setProperty("/warehouseNo", "");
        activeSession.setProperty("/workCenterId", "");
        activeSession.setProperty("/resourceId", "");

        // Clear the saved session from localStorage.
        this.sessions.clearSession();
        MessageToast.show("Logout successful");
        this.loginPopover?.close();
    }

    public onSavePress(): void {
        const loginDraft = this.getModel("loginDraft") as JSONModel;
        const settings: UserSettings = {
            warehouseNo: loginDraft.getProperty("/warehouseNo"),
            workCenterId: loginDraft.getProperty("/workCenterId"),
            resourceId: loginDraft.getProperty("/resourceId")
        };
        this.sessions.saveSettings(settings);
        MessageToast.show("Preferences saved.");
    }

    public onCancelPress(): void {
        this.loginPopover?.close(); // Discard edits - just close without saving anything.
    }

    // --- Private Helpers --------------------------------------------------------

    private registerHeaderLoginButton(): void {
        if (this.headerButtonAdded) { return; }

        const ushellContainer = (window as {
            sap?: {
                ushell?: {
                    Container?: {
                        getRenderer?: (name: string) => ShellRenderer | undefined;
                        attachRendererCreatedEvent?: (callback: () => void) => void;
                    };
                };
            };
        }).sap?.ushell?.Container;

        const renderer = ushellContainer?.getRenderer?.("fiori2");

        if (!renderer) {
            ushellContainer?.attachRendererCreatedEvent?.(() => { this.registerHeaderLoginButton(); }); // Retry when renderer is ready.
            return;
        }

        renderer.addHeaderEndItem(
            {
                id: this.createId("openLoginButton"),
                icon: "sap-icon://BusinessSuiteInAppSymbols/icon-refinery",
                tooltip: "Open Login",
                press: this.onOpenLoginPress.bind(this)
            },
            true,  // visible
            false  // all shell states, not just current
        );
        this.headerButtonAdded = true;
    }

    private async getOrCreateLoginPopover(): Promise<Popover | undefined> {
        if (this.loginPopover) { return this.loginPopover; }

        this.loginPopover = await Fragment.load({
            id: this.createId("centralLoginPopover"),
            name: POPOVER_FRAGMENT_NAME,
            controller: this
        }) as Popover;

        const loginDraftModel = this.getModel("loginDraft");
        if (loginDraftModel) { this.loginPopover.setModel(loginDraftModel, "loginDraft"); } // Popover is outside the view hierarchy.

        const activeSessionModel = this.getModel("activeSession");
        if (activeSessionModel) { this.loginPopover.setModel(activeSessionModel, "activeSession"); }

        this.getRootControl()?.addDependent(this.loginPopover); // Destroyed with the component.
        return this.loginPopover;
    }
}