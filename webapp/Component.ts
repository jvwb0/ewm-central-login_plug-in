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
import type { PopoverState } from "./model/Types";
import { loadWarehouses, loadWorkCenters, loadResources, loadDefaultSettings } from "./model/MockBackend";

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
    // Cached popover instance, loaded once and reused on every open.
    private loginPopover: Popover | undefined;
    // Prevents the header button from being added more than once.
    private headerButtonAdded = false;
    public static metadata = {
        manifest: "json", interfaces: ["sap.ui.core.IAsyncContentCreation"]
    };

    // Called once when the app starts. Sets up models and the header button.
    public init(): void {
        super.init();
        this.setModel(createDeviceModel(), "device");

        // popover_state is what the user edits in the popover.
        // It is separate from the committed session so Cancel works correctly.
        // TwoWay means ComboBox changes update the model without extra code.
        const popoverState: PopoverState = {
            warehouseNo: "001",
            workCenterId: "WC01",
            resourceId: "R01",
            showUpdateButton: false
        };
        const popoverStateModel = new JSONModel(popoverState);
        popoverStateModel.setDefaultBindingMode("TwoWay");
        this.setModel(popoverStateModel, "popover_state");

        // Load warehouse/work center/resource data from mock JSON files into the "backend" model.
        // The ComboBoxes bind to this model, so swapping in real OData later requires no XML changes.
        this.loadBackendModel().catch((err: unknown) => {
            console.error("MockBackend: failed to initialize backend model", err);
        });

        this.getRouter().initialize();
        this.registerHeaderLoginButton();
    }

    // Adds the login button to the right side of the FLP shell header.
    // If the renderer is not ready yet we wait for it and retry.
    private registerHeaderLoginButton(): void {
        if (this.headerButtonAdded) {
            return;
        }

        // sap.ushell.Container is only available inside a Fiori Launchpad.
        const ushellContainer = (window as {
            sap?: {
                ushell?: {
                    Container?: {
                        getRenderer?: (name: string) => ShellRenderer | undefined;
                        // Renderer not ready yet, subscribe and retry when it is.
                        attachRendererCreatedEvent?: (callback: () => void) => void;
                    };
                };
            };
        }).sap?.ushell?.Container;

        const renderer = ushellContainer?.getRenderer?.("fiori2");

        if (!renderer) {
            ushellContainer?.attachRendererCreatedEvent?.(() => {
                this.registerHeaderLoginButton();
            });
            return;
        }
        // true = visible, false = show in all shell states not just the current one
        renderer.addHeaderEndItem(
            {
                id: this.createId("openLoginButton"),
                icon: "sap-icon://BusinessSuiteInAppSymbols/icon-refinery",
                tooltip: "Open Login",
                press: this.onOpenLoginPress.bind(this)
            },
            true,
            false
        );

        this.headerButtonAdded = true;
    }
    // Loads all mock backend data in parallel and stores it in the "backend" named model.
    // The model structure mirrors the future OData service entity sets so the UI is already
    // coded against the contract that RAP will eventually provide.
    private async loadBackendModel(): Promise<void> {
        const [warehouses, workCenters, resources, defaultSettings] = await Promise.all([
            loadWarehouses(),
            loadWorkCenters(),
            loadResources(),
            loadDefaultSettings()
        ]);

        this.setModel(new JSONModel({
            Warehouses: warehouses,
            WorkCenters: workCenters,
            Resources: resources,
            DefaultSettings: defaultSettings
        }), "backend");
    }

    // Fired when the user clicks the header button. Opens the login popover.
    public async onOpenLoginPress(oEvent: Event): Promise<void> {
        console.log("Header button clicked");

        const loginPopover = await this.getOrCreateLoginPopover();
        // Shell header items are not always UI5 Controls so we fall back to the DOM node.
        const source = oEvent.getSource() as Control | { getDomRef?: () => HTMLElement | null };
        const opener = source instanceof Control ? source : source.getDomRef?.();

        if (!loginPopover) {
            return;
        }

        if (!opener) {
            return;
        }

        loginPopover.openBy(opener);
    }
    // Called when the user picks a different warehouse.
    // Filters the WorkCenter and Resource ComboBoxes to show only entries for that warehouse.
    // If the selection is cleared, all entries are shown.
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
            // No warehouse selected - show all work centers and resources.
            (workCenterCombo?.getBinding("items") as ListBinding | undefined)?.filter([]);
            (resourceCombo?.getBinding("items") as ListBinding | undefined)?.filter([]);
        }

        // Dependent selections are no longer valid after the warehouse changed.
        const popoverState = this.getModel("popover_state") as JSONModel;
        popoverState.setProperty("/workCenterId", "");
        popoverState.setProperty("/resourceId", "");
    }

    // Loads the popover fragment the first time and returns the cached instance after that.
    private async getOrCreateLoginPopover(): Promise<Popover | undefined> {
        const popoverStateModel = this.getModel("popover_state");

        if (this.loginPopover) {
            return this.loginPopover;
        }

        this.loginPopover = await Fragment.load(
            {
                id: this.createId("centralLoginPopover"),
                name: POPOVER_FRAGMENT_NAME,
                controller: this
            }
        ) as Popover;
        // The popover lives outside the normal view hierarchy so we set the model directly.
        if (popoverStateModel) {
            this.loginPopover.setModel(popoverStateModel, "popover_state");
        }
        // addDependent means the popover gets destroyed when the component is destroyed.
        this.getRootControl()?.addDependent(this.loginPopover);
        return this.loginPopover;
    }
}