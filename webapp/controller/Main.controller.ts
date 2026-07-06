import Controller from "sap/ui/core/mvc/Controller";
import XMLView from "sap/ui/core/mvc/XMLView";
import Popover from "sap/m/Popover";
import Event from "sap/ui/base/Event";
import Button from "sap/m/Button";


/**
 * @namespace brown.centralewmlogin.fragments.CentralLoginPopover
 */
export default class Main extends Controller {

    private _oPopover: Popover | undefined;
    private _oPopupView: XMLView | undefined;

    public onInit(): void { }

    public async onOpenLoginPress(oEvent: Event): Promise<void> {
        if (!this._oPopover) {
            const oView = this.getView();

            if (!oView) {
                return;
            }

            this._oPopupView = await XMLView.create({
                id: oView.getId(),
                viewName: "brown.centralewmlogin.view.Popup",
                controller: this
            });

            this._oPopover = this._oPopupView.byId("centralLoginPopover") as Popover | undefined;

            if (!this._oPopover) {
                return;
            }

            oView.addDependent(this._oPopupView);
        }

        const oButton = oEvent.getSource() as Button;
        const oPopover = this._oPopover;

        if (!oPopover) {
            return;
        }

        oPopover.openBy(oButton);
    }
}