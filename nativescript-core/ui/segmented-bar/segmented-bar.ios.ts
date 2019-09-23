import { Font } from "../styling/font";
import {
    SegmentedBarItemBase, SegmentedBarBase, selectedIndexProperty, itemsProperty, selectedBackgroundColorProperty,
    colorProperty, fontInternalProperty, Color
} from "./segmented-bar-common";
import { ios as iosUtils } from "../../utils/utils";
import { device } from '../../platform';

export * from "./segmented-bar-common";
const isIOS13 = parseInt(device.osVersion) >= 13;
export class SegmentedBarItem extends SegmentedBarItemBase {
    public _update() {
        const parent = <SegmentedBar>this.parent;
        if (parent) {
            let tabIndex = parent.items.indexOf(this);
            let title = this.title;
            title = (title === null || title === undefined) ? "" : title;
            parent.ios.setTitleForSegmentAtIndex(title, tabIndex);
        }
    }
}

export class SegmentedBar extends SegmentedBarBase {
    nativeViewProtected: UISegmentedControl;
    private _selectionHandler: NSObject;

    createNativeView() {
        return UISegmentedControl.new();
    }

    initNativeView() {
        super.initNativeView();
        this._selectionHandler = SelectionHandlerImpl.initWithOwner(new WeakRef(this));
        this.nativeViewProtected.addTargetActionForControlEvents(this._selectionHandler, "selected", UIControlEvents.ValueChanged);
    }

    disposeNativeView() {
        this._selectionHandler = null;
        super.disposeNativeView();
    }

    get ios(): UISegmentedControl {
        return this.nativeViewProtected;
    }

    [selectedIndexProperty.getDefault](): number {
        return -1;
    }
    [selectedIndexProperty.setNative](value: number) {
        this.ios.selectedSegmentIndex = value;
    }

    [itemsProperty.getDefault](): SegmentedBarItem[] {
        return null;
    }
    [itemsProperty.setNative](value: SegmentedBarItem[]) {
        const segmentedControl = this.ios;
        segmentedControl.removeAllSegments();
        const newItems = value;

        if (newItems && newItems.length) {
            newItems.forEach((item, index, arr) => {
                let title = item.title;
                title = (title === null || title === undefined) ? "" : title;
                segmentedControl.insertSegmentWithTitleAtIndexAnimated(title, index, false);
            });
        }
        // coerce does not update style when resetting items on existing segmentedbar
        segmentedControl.selectedSegmentIndex = 0; // default to 0 selected so at least an item is selected
        // selectedIndexProperty.coerce(this);
    }

    [selectedBackgroundColorProperty.getDefault](): UIColor {
        const currentOsVersion = iosUtils.MajorVersion;

        return currentOsVersion < 13 ? this.ios.tintColor : this.ios.selectedSegmentTintColor;
    }
    [selectedBackgroundColorProperty.setNative](value: UIColor | Color) {
        const currentOsVersion = iosUtils.MajorVersion;
        let color = value instanceof Color ? value.ios : value;
        if (currentOsVersion < 13) {
            this.ios.tintColor = color;
        } else {
            this.ios.selectedSegmentTintColor = color;
        }
        
        // this.ios.tintColor = color;
        // if (isIOS13) {
        //   // CUSTOM - just ensuring white background segment doesn't have white text (just making them black for now)
        //   const currentAttrs = this.ios.titleTextAttributesForState(UIControlState.Selected);
        //   const attrs = currentAttrs ? currentAttrs.mutableCopy() : NSMutableDictionary.new();
        //   attrs.setValueForKey(UIColor.blackColor, NSForegroundColorAttributeName);
        //   this.ios.setTitleTextAttributesForState(attrs, UIControlState.Selected);
        // }
    }

    [colorProperty.getDefault](): UIColor {
        return null;
    }
    [colorProperty.setNative](value: Color | UIColor) {
        let color = value instanceof Color ? value.ios : value;
        let bar = this.ios;
        let currentAttrs = bar.titleTextAttributesForState(UIControlState.Normal);
        let attrs = currentAttrs ? currentAttrs.mutableCopy() : NSMutableDictionary.new();
        attrs.setValueForKey(color, NSForegroundColorAttributeName);
        bar.setTitleTextAttributesForState(attrs, UIControlState.Normal);
    }

    [fontInternalProperty.getDefault](): Font {
        return null;
    }
    [fontInternalProperty.setNative](value: Font) {
        let font: UIFont = value ? value.getUIFont(UIFont.systemFontOfSize(UIFont.labelFontSize)) : null;
        let bar = this.ios;
        let currentAttrs = bar.titleTextAttributesForState(UIControlState.Normal);
        let attrs = currentAttrs ? currentAttrs.mutableCopy() : NSMutableDictionary.new();
        attrs.setValueForKey(font, NSFontAttributeName);
        bar.setTitleTextAttributesForState(attrs, UIControlState.Normal);
    }
}

class SelectionHandlerImpl extends NSObject {

    private _owner: WeakRef<SegmentedBar>;

    public static initWithOwner(owner: WeakRef<SegmentedBar>): SelectionHandlerImpl {
        let handler = <SelectionHandlerImpl>SelectionHandlerImpl.new();
        handler._owner = owner;

        return handler;
    }

    public selected(sender: UISegmentedControl) {
        let owner = this._owner.get();
        if (owner) {
            owner.selectedIndex = sender.selectedSegmentIndex;
        }
    }

    public static ObjCExposedMethods = {
        "selected": { returns: interop.types.void, params: [UISegmentedControl] }
    };
}
