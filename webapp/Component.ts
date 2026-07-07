import BaseComponent from "sap/ui/core/UIComponent";
import Fragment from "sap/ui/core/Fragment";
import Popover from "sap/m/Popover";
import Event from "sap/ui/base/Event";
import Control from "sap/ui/core/Control";
import JSONModel from "sap/ui/model/json/JSONModel";
import { createDeviceModel } from "./model/models";
import type { PopoverState } from "./model/Types";

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
    // Loads the popover fragment the first time and returns the cached instance after that.
    private async getOrCreateLoginPopover(): Promise<Popover | undefined> {
        const popoverStateModel = this.getModel("popover_state");

        if (this.loginPopover) {
            return this.loginPopover;
        }

        this.loginPopover = await Fragment.load(
            {
                id: this.createId("centralLoginPopover"),
                name: POPOVER_FRAGMENT_NAME
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