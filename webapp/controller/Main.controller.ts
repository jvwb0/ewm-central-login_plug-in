import Controller from "sap/ui/core/mvc/Controller";
import Fragment from "sap/ui/core/Fragment";
import Popover from "sap/m/Popover";
import Event from "sap/ui/base/Event";
import Button from "sap/m/Button";


/**
 * @namespace brown.centralewmlogin.fragments.CentralLoginPopover
 */
export default class Main extends Controller {

    private _oPopover: Popover | undefined;

    public onInit(): void { }

    public async onOpenLoginPress(oEvent: Event): Promise<void> {
        if (!this._oPopover) {
            const oView = this.getView();

            if (!oView) {
                return;
            }

            this._oPopover = await Fragment.load({
                id: oView.getId(),
                name: "brown.centralewmlogin.fragments.CentralLoginPopover",
                controller: this
            }) as Popover;

            oView.addDependent(this._oPopover);
        }

        const oButton = oEvent.getSource() as Button;
        const oPopover = this._oPopover;

        if (!oPopover) {
            return;
        }

        oPopover.openBy(oButton);
    }
}