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
import type { PluginState, PopoverState, UserSettings } from "./model/Types";
import SessionManager from "./model/Sessions";
import MessageToast from "sap/m/MessageToast";
import EventBus from "sap/ui/core/EventBus";
import SapPcpWebSocket from "sap/ui/core/ws/SapPcpWebSocket";

// Minimal type for the FLP shell renderer. Only typing what we actually use.
type ShellRenderer = {
    addHeaderEndItem: (
        properties: Record<string, unknown>,
        isVisible: boolean,
        isCurrentState: boolean
    ) => void;
};
const POPOVER_FRAGMENT_NAME = "brown.centralewmlogin.fragments.CentralLoginPopover";

//Singleton to prevent multiple active FLP plugin instances.
let oActiveInstance: Component | null = null;
/****************************************************************************************
 * @namespace brown.centralewmlogin
 */
export default class Component extends BaseComponent {

    private _oPopover?: Popover;
    private _bHeaderButtonAdded = false;
    private _oSessionManager!: SessionManager;
    private _oSocket?: SapPcpWebSocket;
    private _oEventBus?: EventBus;
    private _bSocketOpen = false;
    private _bLoginPending = false;

    public static metadata = { manifest: "json", interfaces: ["sap.ui.core.IAsyncContentCreation"] };

    // --- Lifecycle --------------------------------------------------------------

    public init(): void {
        super.init();

        if (oActiveInstance) { return; }
        oActiveInstance = this;

        this._oSessionManager = new SessionManager();

        this.setModel(createDeviceModel(), "device");

        // Create initial data
        const oPluginState = this._createInitialPluginState();
        const oPopoverState = this._createInitialPopoverState(oPluginState);

        // Create models
        const oStateModel = new JSONModel(oPluginState);
        const oPopoverStateModel = new JSONModel(oPopoverState);
        oPopoverStateModel.setDefaultBindingMode("TwoWay"); // Two-way binding so that changes in the popover are reflected in the model.

        // Register models
        this.setModel(
            oStateModel,
            "state"
        );

        this.setModel(
            oPopoverStateModel,
            "popover_state"
        );

        this.getRouter().initialize();
        this._registerHeaderLoginButton();
        //this._connectSocket();
    }

    // Get state from session, otherwise create default state
    private _createInitialPluginState(): PluginState {
        const oSavedSession = this._oSessionManager.loadSession();

        if (oSavedSession) { return oSavedSession; }

        return {
            isLoggedIn: false,
            warehouseNo: "",
            workCenterId: "",
            resourceId: ""
        };
    }

    private _createInitialPopoverState(oPluginState: PluginState): PopoverState {
        // If already logged in, use the active session values.
        if (oPluginState.isLoggedIn) {
            return {
                warehouseNo: oPluginState.warehouseNo,
                workCenterId: oPluginState.workCenterId,
                resourceId: oPluginState.resourceId,
                showUpdateButton: false
            };
        }
        // Otherwise fall back to the user's saved preferences.
        const oSavedSettings = this._oSessionManager.loadSettings();

        if (oSavedSettings) {
            return {
                warehouseNo: oSavedSettings.warehouseNo,
                workCenterId: oSavedSettings.workCenterId,
                resourceId: oSavedSettings.resourceId,
                showUpdateButton: false
            };
        }
        return {
            warehouseNo: "",
            workCenterId: "",
            resourceId: "",
            showUpdateButton: false
        };
    }

    private _connectSocket(): void {
        if (this._oSocket) { return; } // Already connected

        const oPopoverState = this._popoverStateModel();
        const sWarehouseNo = oPopoverState.getProperty("/warehouseNo") as string;
        const sResourceId = oPopoverState.getProperty("/resourceId") as string;

        if (!sWarehouseNo || !sResourceId) { // Cannot connect without warehouse and resource.
            MessageToast.show("Please select a warehouse and resource.");
            return;
        }
        const sUrl = "/sap/bc/apc/sap/zewm_bro_fiori_ext_plugin" +
            `?warehouseNo=${encodeURIComponent(sWarehouseNo)}` +
            `&resourceId=${encodeURIComponent(sResourceId)}`;

        this._bLoginPending = true;
        this._oSocket = new SapPcpWebSocket(sUrl);

        this._oSocket.attachOpen(() => {
            this._bSocketOpen = true;
            console.log("APC Socket connection established.");
        });

        this._oSocket.attachMessage((oEvent: Event) => {
            const sMessage = oEvent.getParameter("data") as string | undefined;

            if (!sMessage) { return; }
            // Handle the incoming message here.
            console.log("APC Message:", sMessage);
            this._handleOnMessage(sMessage);
        });

        this._oSocket.attachError((oEvent: Event) => {
            console.error("APC Socket error:", oEvent);

            this._bLoginPending = false;
            MessageToast.show("Socket error occurred. Please check the console for details.");
        });

        this._oSocket.attachClose(() => {
            console.log("APC Socket connection closed.");
            this._bSocketOpen = false;
            this._bLoginPending = false;
            this._oSocket = undefined;
        });
    }

    private _disconnectSocket(): void {
        const oSocket = this._oSocket;

        this._oSocket = undefined;
        this._bSocketOpen = false;
        this._bLoginPending = false;

        if (oSocket) { oSocket.close(); } // Close the socket if it exists. This will trigger the 'close' event and clean up the connection.
    }

    private _requestLogin(): void {
        if (this._bLoginPending) { return; } // Prevent multiple login requests
        if (this._oSocket) { MessageToast.show("Already connected. Please log off first."); return; }
        this._connectSocket();
    }

    private _requestLogoff(): void {

        // implemented later

    }


    // --- Event Handlers ---------------------------------------------------------

    public async onOpenLoginPress(oEvent: Event): Promise<void> {
        this._oPopover = await this._getOrCreateLoginPopover();

        // FLP header items are not always UI5 Controls.
        const oSource = oEvent.getSource() as
            Control | {
                getDomRef?: () => HTMLElement | null;
            };

        let oOpener:
            Control |
            HTMLElement |
            null |
            undefined;

        // Determine which object should be used to anchor the popover.
        if (oSource instanceof Control) {
            oOpener = oSource;
        } else if (oSource.getDomRef) {
            oOpener = oSource.getDomRef();
        } else {
            oOpener = undefined;
        }

        // Cannot open without a popover instance or anchor element.
        if (!this._oPopover) { return; }
        if (!oOpener) { return; }

        this._oPopover.openBy(oOpener);
    }

    public onWarehouseChanged(oEvent: Event): void {
        const sWarehouseNo = (oEvent.getSource() as ComboBox).getSelectedKey();
        this._applyWarehouseFilter(sWarehouseNo);
        // Changing the warehouse invalidates dependent selections.
        this._resetDependentSelections();
    }

    public onLoginPress(): void {
        this._requestLogin();
    }

    public onLogoutPress(): void {
        this._performLogoff();
        this._oPopover?.close();
    }

    public onSavePress(): void {
        this._saveUserSettings();
        MessageToast.show("Preferences saved.");
    }

    public onCancelPress(): void {
        this._oPopover?.close(); // Discard edits - just close without saving anything.
    }

    // --- Private Helpers --------------------------------------------------------
    private _performLogin(): void {
        const oState = this._stateModel();
        const oPopoverState = this._popoverStateModel();
        // Commit popover values to the active plugin state.
        const oConfirmedState: PluginState = {
            isLoggedIn: true,
            warehouseNo: oPopoverState.getProperty("/warehouseNo") as string,
            workCenterId: oPopoverState.getProperty("/workCenterId") as string,
            resourceId: oPopoverState.getProperty("/resourceId") as string
        };
        // Commit the backend-confirmed login state 
        oState.setData(oConfirmedState);
        // Persist the confirmed active session.
        this._oSessionManager.saveSession(oState.getData());
        //keep for now, we can decide later if we want to save user settings on login or not.
        this._saveUserSettings();
        MessageToast.show("Login successful");
    }

    private _performLogoff(): void {
        const oState = this._stateModel();

        // Clear the committed login state.
        oState.setData({
            isLoggedIn: false,
            warehouseNo: "",
            workCenterId: "",
            resourceId: ""
        });
        this._oSessionManager.clearSession();

        MessageToast.show("Logout successful");
    }

    private _saveUserSettings(): void {
        const oPopoverState = this._popoverStateModel();
        const oSettings: UserSettings = {
            warehouseNo: oPopoverState.getProperty("/warehouseNo"),
            workCenterId: oPopoverState.getProperty("/workCenterId"),
            resourceId: oPopoverState.getProperty("/resourceId")
        };
        this._oSessionManager.saveSettings(oSettings);
    }

    private _stateModel(): JSONModel {
        return this.getModel("state") as JSONModel;
    }

    private _popoverStateModel(): JSONModel {
        return this.getModel("popover_state") as JSONModel;
    }

    // Restrict Work Centers and Resources to the selected warehouse.
    private _applyWarehouseFilter(sWarehouseNo: string): void {
        const sFragmentId = this.createId("centralLoginPopover");
        const oWorkCenterCombo = Fragment.byId(sFragmentId, "workCenterSelect") as ComboBox | undefined;
        const oResourceCombo = Fragment.byId(sFragmentId, "resourceSelect") as ComboBox | undefined;
        const oWorkCenterBinding = oWorkCenterCombo?.getBinding("items") as ListBinding | undefined;
        const oResourceBinding = oResourceCombo?.getBinding("items") as ListBinding | undefined;

        // No warehouse selected: show all values.
        if (!sWarehouseNo) {
            oWorkCenterBinding?.filter([]);
            oResourceBinding?.filter([]);
            return;
        }
        const oFilter = new Filter("Lgnum", FilterOperator.EQ, sWarehouseNo);
        oWorkCenterBinding?.filter([oFilter]);
        oResourceBinding?.filter([oFilter]);
    }

    private _resetDependentSelections(): void {
        this._popoverStateModel().setProperty("/workCenterId", "");
        this._popoverStateModel().setProperty("/resourceId", "");
    }
    // Central routing point for all backend/WebSocket messages.
    private _handleOnMessage(sMessage: string): void {
        switch (sMessage) {
            case "logonSuccess":
                this._bLoginPending = false;
                this._performLogin();
                this._oPopover?.close();
                break;
            case "logonFail":
                this._bLoginPending = false;
                MessageToast.show("Login failed. Please check your selections and try again.");
                this._disconnectSocket();
                break;
            case "logoff":
                this._bLoginPending = false;
                this._disconnectSocket();
                break;
            default:
                console.warn("Unknown APC message:", sMessage);
        }
    }
    // why methods after this point dont have __ before their name?
    private _registerHeaderLoginButton(): void {

        if (this._bHeaderButtonAdded) { return; }

        const oUshellContainer = (window as {
            sap?: {
                ushell?: {
                    Container?: {
                        getRenderer?: (
                            name: string
                        ) => ShellRenderer | undefined;

                        attachRendererCreatedEvent?: (
                            callback: () => void
                        ) => void;
                    };
                };
            };
        }).sap?.ushell?.Container;

        const oRenderer = oUshellContainer?.getRenderer?.("fiori2");
        // FLP renderer may not be available during initial startup.
        if (!oRenderer) {
            // Retry button registration once the renderer becomes available
            oUshellContainer?.attachRendererCreatedEvent?.(() => { this._registerHeaderLoginButton(); });
            return;
        }

        oRenderer.addHeaderEndItem({
            id: this.createId("openLoginButton"),
            icon: "sap-icon://BusinessSuiteInAppSymbols/icon-refinery",
            tooltip: "Open Login",
            press: this.onOpenLoginPress.bind(this)
        },
            true,
            false
        );

        this._bHeaderButtonAdded = true;
    }
    // Reuse the existing popover instance once it has been loaded.
    private async _getOrCreateLoginPopover(): Promise<Popover> {

        if (this._oPopover) {
            return this._oPopover;
        }

        this._oPopover = await Fragment.load({
            id: this.createId("centralLoginPopover"),
            name: POPOVER_FRAGMENT_NAME,
            controller: this
        }) as Popover;

        // The popover exists outside the normal view hierarchy and must
        // therefore receive models explicitly.
        const oPopoverStateModel = this.getModel("popover_state");
        if (oPopoverStateModel) {
            this._oPopover.setModel(oPopoverStateModel, "popover_state");
        }

        const oStateModel = this.getModel("state");
        if (oStateModel) {
            this._oPopover.setModel(oStateModel, "state");
        }

        const oBackendModel = this.getModel("backend");
        if (oBackendModel) {
            this._oPopover.setModel(oBackendModel, "backend");
        }

        const oRootControl = this.getRootControl();
        if (oRootControl) {
            oRootControl.addDependent(this._oPopover);
        }
        return this._oPopover;
    }
}