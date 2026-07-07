import BaseComponent from "sap/ui/core/UIComponent";
import Fragment from "sap/ui/core/Fragment";
import Popover from "sap/m/Popover";
import Event from "sap/ui/base/Event";
import Control from "sap/ui/core/Control";
import { createDeviceModel } from "./model/models";

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

    private loginPopover: Popover | undefined;
    private headerButtonAdded = false;

    public static metadata = {
        manifest: "json",
        interfaces: [
            "sap.ui.core.IAsyncContentCreation"
        ]
    };

    public init(): void {
        super.init();
        this.setModel(createDeviceModel(), "device");
        this.getRouter().initialize();
        this.registerHeaderLoginButton();
    }

    private registerHeaderLoginButton(): void {
        if (this.headerButtonAdded) {
            return;
        }

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
            ushellContainer?.attachRendererCreatedEvent?.(() => {
                this.registerHeaderLoginButton();
            });

            return;
        }

        renderer.addHeaderEndItem(
            {
                id: this.createId("openLoginButton"),
                icon: "sap-icon://BusinessSuiteInAppSymbols/icon-refinery",
                tooltip: "Open Login",
                press: [this.onOpenLoginPress, this]
            },
            true,
            false
        );

        this.headerButtonAdded = true;
    }

    public async onOpenLoginPress(oEvent: Event): Promise<void> {
        const loginPopover = await this.getOrCreateLoginPopover();

        if (!loginPopover) {
            return;
        }

        loginPopover.openBy(oEvent.getSource() as Control);
    }

    private async getOrCreateLoginPopover(): Promise<Popover | undefined> {
        if (this.loginPopover) {
            return this.loginPopover;
        }

        this.loginPopover = await Fragment.load({
            id: this.createId("centralLoginPopover"),
            name: POPOVER_FRAGMENT_NAME
        }) as Popover;

        this.getRootControl()?.addDependent(this.loginPopover);

        return this.loginPopover;
    }
}