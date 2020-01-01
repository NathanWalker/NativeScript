import { TabViewItem as TabViewItemDefinition } from ".";
import { Font } from "../styling/font";

import { ios as iosView, ViewBase } from "../core/view";
import {
    TabViewBase, TabViewItemBase, itemsProperty, selectedIndexProperty,
    tabTextColorProperty, tabTextFontSizeProperty, tabBackgroundColorProperty, selectedTabTextColorProperty, iosIconRenderingModeProperty, tabGradientsProperty,
    View, fontInternalProperty, layout, traceEnabled, traceWrite, traceCategories, Color, traceMissingIcon
} from "./tab-view-common";
import { textTransformProperty, TextTransform, getTransformedText } from "../text-base";
import { ImageSource } from "../../image-source";
import { profile } from "../../profiling";
import { Frame } from "../frame";
import { ios as iosUtils } from "../../utils/utils";
import { device } from "../../platform";
export * from "./tab-view-common";

const majorVersion = iosUtils.MajorVersion;
const isPhone = device.deviceType === "Phone";
let isIPhoneX;
declare var uname;
let contentViewHeight;
let contentViewOffsetHeight;
let topFrameOffset;

const checkIsIPhoneX = function() {
  if (typeof isIPhoneX === "undefined") {
    const _SYS_NAMELEN: number = 256;

    const buffer: any = interop.alloc(5 * _SYS_NAMELEN);
    uname(buffer);
    let name: string = NSString.stringWithUTF8String(buffer.add(_SYS_NAMELEN * 4)).toString();

    // Get machine name for Simulator
    if (name === "x86_64" || name === "i386") {
      name = NSProcessInfo.processInfo.environment.objectForKey("SIMULATOR_MODEL_IDENTIFIER");
    }

    // console.log("isIPhoneX name:', name);
    const parts = name.toLowerCase().split('iphone');
    if (parts && parts.length > 1) {
      const versionNumber = parseInt(parts[1]);
      if (!isNaN(versionNumber)) {
        isIPhoneX = versionNumber >= 11;
      }
    }
    if (!isIPhoneX) {
      // consider iphone x global and iphone x gsm
      isIPhoneX = name.indexOf('iPhone10,3') === 0 || name.indexOf('iPhone10,6') === 0;
    }
    // isIPhoneX =
    //     name.indexOf("iPhone10,3") === 0 ||
    //     name.indexOf("iPhone10,6") === 0 ||
    //     name.indexOf("iPhone11,8") === 0 ||
    //     name.indexOf("iPhone11,6") === 0 || // XS Max (china variant)
    //     name.indexOf("iPhone11,4") === 0 || // XS Max (us variant)
    //     name.indexOf("iPhone11,2") === 0;
  }
};
const isIOS13 = parseInt(device.osVersion) >= 13;

class UITabBarControllerImpl extends UITabBarController {

    tabGradientColors: Array<any>;
    tabGradients: Array<any>;
    private paintedBgForIndex: any;
    private paintedGradientImages: any;
    private previousSelectedIndex: number;
    private _owner: WeakRef<TabView>;

    public static initWithOwner(owner: WeakRef<TabView>): UITabBarControllerImpl {
        let handler = <UITabBarControllerImpl>UITabBarControllerImpl.new();
        contentViewHeight = handler.view.bounds.size.height;
        // If this is changed to literally 88 it will show bumper at bottom
        // (1 point under 88 will allow it to bleed/overflow properly)
        contentViewOffsetHeight = 87;
        if (isIPhoneX) {
          topFrameOffset = 88;
            handler.view.frame = CGRectMake(0, topFrameOffset, handler.view.bounds.size.width, contentViewHeight - contentViewOffsetHeight);
        } else {
          topFrameOffset = 64;
          contentViewOffsetHeight = 63;
          handler.view.frame = CGRectMake(0, topFrameOffset, handler.view.bounds.size.width, contentViewHeight - contentViewOffsetHeight);
        }
        handler._owner = owner;

        return handler;
    }

    public viewDidLoad(): void {
        super.viewDidLoad();

        // Unify translucent and opaque bars layout
        // this.edgesForExtendedLayout = UIRectEdgeBottom;
        this.extendedLayoutIncludesOpaqueBars = true;
    }

    @profile
    public viewWillAppear(animated: boolean): void {
        super.viewWillAppear(animated);
        const owner = this._owner.get();
        if (!owner) {
            return;
        }

        // Unify translucent and opaque bars layout
        // this.extendedLayoutIncludesOpaqueBars = true;

        iosView.updateAutoAdjustScrollInsets(this, owner);

        if (!owner.parent) {
            owner.callLoaded();
        }
    }

    // @profile
    // public viewWillLayoutSubviews(): void {
    //     super.viewWillLayoutSubviews();
    //     const owner = this._owner.get();
    //     if (!owner) {
    //         return;
    //     }
    //     let offset = 0;
    //     let tabBarHeight = 0;
    //     let didAdjust = false;
    //     // avoid repainting gradient extraneously
    //     if (!this.paintedBgForIndex) {
    //       this.paintedBgForIndex = {};
    //       this.paintedGradientImages = {};
    //     }
    //     if (owner.ios.tabBar.frame.origin.y > 0) {
    //       // handle case where a modal or some other view opens which upon closing resets UITabBar
    //       // re-layout the UITabBar in this case
    //       didAdjust = true;
    //       tabBarHeight = 83;

    //       // handle frame positioning
    //       if (isIPhoneX) {
    //         this.view.frame = CGRectMake(0, topFrameOffset, this.view.bounds.size.width, contentViewHeight - contentViewOffsetHeight);
    //         const height = tabBarHeight || owner.ios.tabBar.bounds.size.height;
    //         owner.ios.tabBar.frame = CGRectMake(0, offset, owner.ios.view.bounds.size.width, height);
    //       } else {
    //         this.view.frame = CGRectMake(0, topFrameOffset, this.view.bounds.size.width, contentViewHeight - contentViewOffsetHeight);
    //         const height = tabBarHeight || owner.ios.tabBar.bounds.size.height;
    //         owner.ios.tabBar.frame = CGRectMake(0, 0, owner.ios.view.bounds.size.width, height);
    //       }
    //     }
    //     if (this.tabGradients && !this.paintedBgForIndex[this.selectedIndex]) {
    //       // console.log('changing gradient!!')
    //       // reset all indices
    //       for (var i = 0; i < 5; i++) {
    //         this.paintedBgForIndex[i] = false;
    //       }
    //       this.paintedBgForIndex[this.selectedIndex] = true;

    //       // Previously hard coded (leaving for example - this is now handled by tabGradients property)
    //       // let colors;
    //       // switch (this.selectedIndex) {
    //       //   case 0:
    //       //       colors = [UIColor.colorWithRedGreenBlueAlpha(.64, .49, 1, 1).CGColor, UIColor.colorWithRedGreenBlueAlpha(.93, .44, .73, 1).CGColor];
    //       //       break;
    //       //   case 1:
    //       //       // colors = [UIColor.colorWithRedGreenBlueAlpha(.27, .84, .99, 1).CGColor, UIColor.colorWithRedGreenBlueAlpha(.92, .47, .83, 1).CGColor];
    //       //       colors = [UIColor.colorWithRedGreenBlueAlpha(.27, .57, .92, 1).CGColor, UIColor.colorWithRedGreenBlueAlpha(.71, .36, .87, 1).CGColor];
    //       //       break;
    //       //   case 2:
    //       //       colors = [UIColor.colorWithRedGreenBlueAlpha(1, .51, .46, 1).CGColor, UIColor.colorWithRedGreenBlueAlpha(1, .8, .28, 1).CGColor];
    //       //       break;
    //       //   case 3:
    //       //       colors = [UIColor.colorWithRedGreenBlueAlpha(.45, .57, 1, 1).CGColor, UIColor.colorWithRedGreenBlueAlpha(.15, .85, 1, 1).CGColor];
    //       //       break;
    //       //   case 4:
    //       //       colors = [UIColor.colorWithRedGreenBlueAlpha(.01, .66, .71, 1).CGColor, UIColor.colorWithRedGreenBlueAlpha(.47, .95, .57, 1).CGColor];
    //       //       break;
    //       // }
    //       this.changeBackgroundGradient(owner.ios, this.tabGradients[this.selectedIndex]);

    //       // can make tabbar fully transparent with this:
    //       // owner.ios.tabBar.shadowImage = UIImage.new();
    //       // owner.ios.tabBar.backgroundImage = UIImage.new();
  
    //       // important to be able to use flat (full) color (without tinting)
    //       owner.ios.tabBar.translucent = false;
    //     }
    // }

    @profile
    public viewDidLayoutSubviews(): void {
      super.viewDidLayoutSubviews();
      const owner = this._owner.get();
      if (!owner) {
          return;
      }
      // avoid repainting gradient extraneously
      if (!this.paintedBgForIndex) {
        this.paintedBgForIndex = {};
        this.paintedGradientImages = {};
      }
      if (owner.ios.tabBar.frame.origin.y > 0) {
        // handle case where a modal or some other view opens which upon closing resets UITabBar
        // re-layout the UITabBar in this case
        const offset = 0;
        const tabBarHeight = 83;

        // handle frame positioning
        if (isIPhoneX) {
          this.view.frame = CGRectMake(0, topFrameOffset, this.view.bounds.size.width, contentViewHeight - contentViewOffsetHeight);
          const height = tabBarHeight || owner.ios.tabBar.bounds.size.height;
          owner.ios.tabBar.frame = CGRectMake(0, offset, owner.ios.view.bounds.size.width, height);
        } else {
          this.view.frame = CGRectMake(0, topFrameOffset, this.view.bounds.size.width, contentViewHeight - contentViewOffsetHeight);
          const height = tabBarHeight || owner.ios.tabBar.bounds.size.height;
          owner.ios.tabBar.frame = CGRectMake(0, 0, owner.ios.view.bounds.size.width, height);
        }
      }
      if (this.tabGradients && !this.paintedBgForIndex[this.selectedIndex]) {
        // console.log('changing gradient!!')
        // reset all indices
        for (var i = 0; i < 5; i++) {
          this.paintedBgForIndex[i] = false;
        }
        this.paintedBgForIndex[this.selectedIndex] = true;

        // Previously hard coded (leaving for example - this is now handled by tabGradients property)
        // let colors;
        // switch (this.selectedIndex) {
        //   case 0:
        //       colors = [UIColor.colorWithRedGreenBlueAlpha(.64, .49, 1, 1).CGColor, UIColor.colorWithRedGreenBlueAlpha(.93, .44, .73, 1).CGColor];
        //       break;
        //   case 1:
        //       // colors = [UIColor.colorWithRedGreenBlueAlpha(.27, .84, .99, 1).CGColor, UIColor.colorWithRedGreenBlueAlpha(.92, .47, .83, 1).CGColor];
        //       colors = [UIColor.colorWithRedGreenBlueAlpha(.27, .57, .92, 1).CGColor, UIColor.colorWithRedGreenBlueAlpha(.71, .36, .87, 1).CGColor];
        //       break;
        //   case 2:
        //       colors = [UIColor.colorWithRedGreenBlueAlpha(1, .51, .46, 1).CGColor, UIColor.colorWithRedGreenBlueAlpha(1, .8, .28, 1).CGColor];
        //       break;
        //   case 3:
        //       colors = [UIColor.colorWithRedGreenBlueAlpha(.45, .57, 1, 1).CGColor, UIColor.colorWithRedGreenBlueAlpha(.15, .85, 1, 1).CGColor];
        //       break;
        //   case 4:
        //       colors = [UIColor.colorWithRedGreenBlueAlpha(.01, .66, .71, 1).CGColor, UIColor.colorWithRedGreenBlueAlpha(.47, .95, .57, 1).CGColor];
        //       break;
        // }
        this.changeBackgroundGradient(owner.ios, this.tabGradients[this.selectedIndex]);

        // can make tabbar fully transparent with this:
        // owner.ios.tabBar.shadowImage = UIImage.new();
        // owner.ios.tabBar.backgroundImage = UIImage.new();

        // important to be able to use flat (full) color (without tinting)
        owner.ios.tabBar.translucent = false;
      }
    }

    public changeBackgroundGradient(target, colors) {
      if (!target) {
        return;
      }
      if (!this.paintedGradientImages[this.selectedIndex]) {
        // create gradients up front to make tab switches faster from the start
        for (var i = 0; i < this.tabGradients.length; i++) {
          // console.log('tabbar changeBackgroundGradient for index:', this.selectedIndex);
          const layerGradient = CAGradientLayer.layer();
          layerGradient.colors = NSArray.arrayWithArray(this.tabGradients[i]);
          layerGradient.startPoint = CGPointMake(.5, 0);
          layerGradient.endPoint = CGPointMake(.5, 1);
          layerGradient.frame = CGRectMake(0, 0, target.view.bounds.size.width, target.tabBar.bounds.size.height);
          UIGraphicsBeginImageContext(layerGradient.bounds.size);
          layerGradient.renderInContext(UIGraphicsGetCurrentContext());
          const resultImage = UIGraphicsGetImageFromCurrentImageContext();
          this.paintedGradientImages[i] = resultImage;
        }
      }
      target.tabBar.backgroundImage = this.paintedGradientImages[this.selectedIndex];
    }

    // @profile
    // public viewDidLoad(): void {
    //     super.viewDidLoad();
    //     const owner = this._owner.get();
    //     if (!owner) {
    //         return;
    //     }

    //     /**
    //      * GRADIENT TABBAR
    //      */
    //     const layerGradient = CAGradientLayer.new();
    //     layerGradient.colors = NSArray.arrayWithArray( [new Color("#fff").ios.CGColor, new Color("#FCBB54").ios.CGColor]);
    //     layerGradient.startPoint = CGPointMake(0, 0);
    //     layerGradient.endPoint = CGPointMake(0, 1);
    //     layerGradient.frame = CGRectMake(0, 0, this.tabBar.bounds.size.width, this.tabBar.bounds.size.height + 44);
    //     this.tabBar.layer.addSublayer(layerGradient);
    // }

    public tabBarDidSelectItem(tabBar, item) {
      if (item) {
        var owner = this._owner.get();
        if (!owner) {
            return;
        }
        // when selecting tabs, just reset bg painting so when it does a relayout will paint it with correct gradient above in viewWiilLayoutSubviews
        this.paintedBgForIndex[this.selectedIndex] = false;

        // console.log('item tag (this is same as this.selectedIndex):', item.tag);

        // IMPORTANT NOTE:
        // https://stackoverflow.com/a/51542606/2192332
        // Keep in mind that the order of the subviews in the UITabBar may be unordered so accessing the correct item from it using an index may not work correctly.
        // Therefore sort by interactive controls and then sort by position
        const orderedTabItemViews = [];
        for (var i = 0; i < owner.ios.tabBar.subviews.count; i++) {
          var view = owner.ios.tabBar.subviews.objectAtIndex(i);
          if (view.userInteractionEnabled) {
            // reset shadow
            // view.subviews.firstObject.layer.shadowOpacity = 0;
            orderedTabItemViews.push(view);
          }
        }
        orderedTabItemViews.sort((a, b) => a.frame.origin.x - b.frame.origin.x);
        // console.log('orderedTabItemViews:', orderedTabItemViews.map(item => item.frame.origin.x));

        // const selectedItem = orderedTabItemViews[item.tag].subviews.firstObject;
        const selectedIndex = owner.ios.tabBar.items.indexOfObject(item);
        let selectedItem;
        if (isIOS13) {
          // Yeah this is funny no doubt - super subtle difference in animating icons in tabbar
          selectedItem = orderedTabItemViews[selectedIndex].subviews.lastObject;
        } else {
          selectedItem = orderedTabItemViews[selectedIndex].subviews.firstObject;
        }
        // console.log('selectedItem:', selectedItem);
        let previousSelectedItem;
        if (typeof this.previousSelectedIndex === "undefined") {
          // since app starts with selectedIndex 0, set explicitly to start (can use to start at different index as well)
          this.previousSelectedIndex = 0;
        } else {
          previousSelectedItem = orderedTabItemViews[this.previousSelectedIndex].subviews.firstObject;
          // reset previousSelected for next time
          this.previousSelectedIndex = selectedIndex;//item.tag;
        }

        UIView.animateWithDurationDelayUsingSpringWithDampingInitialSpringVelocityOptionsAnimationsCompletion(
          .5,
          0,
          .5,
          .5,
          UIViewAnimationOptions.CurveEaseInOut,
          function () {
          const scale = CGAffineTransformMakeScale(1.2, 1.2);
          // selectedItem.transform = CGAffineTransformConcat(scale, CGAffineTransformMakeRotation(.2)); 
          selectedItem.transform = scale;

          if (previousSelectedItem) {
            // deselection animation
            previousSelectedItem.transform = CGAffineTransformMakeScale(.9, .9);
          }
          // selectedItem.alpha = 1;

          // shadow effect
          // selectedItem.layer.masksToBounds = false;

          // selectedItem.layer.shadowColor = utils_1.ios.getter(UIColor, UIColor.whiteColor).CGColor;
          // selectedItem.layer.shadowOpacity = 1;
          // selectedItem.layer.shadowRadius = 2;

          // // selectedItem.layer.shadowColor = utils_1.ios.getter(UIColor, UIColor.blackColor).CGColor;
          // // selectedItem.layer.shadowOpacity = 0.8;
          // // selectedItem.layer.shadowRadius = 1.5;
            
          // selectedItem.layer.cornerRadius = selectedItem.frame.size.height/2;
          // selectedItem.layer.shadowOffset = CGSizeMake(0, 0);

            UIView.animateWithDurationDelayUsingSpringWithDampingInitialSpringVelocityOptionsAnimationsCompletion(
              .5,
              .2,
              .5,
              .5,
              UIViewAnimationOptions.CurveEaseInOut,
               function () {
                const scale = CGAffineTransformMakeScale(1, 1);
                // selectedItem.transform = CGAffineTransformConcat(scale, CGAffineTransformMakeRotation(0));
                selectedItem.transform = scale;
                if (previousSelectedItem) {
                  // deselection animation
                  previousSelectedItem.transform = scale;
                }
            }, function (completed) {
              // ignore
            });
        }, function (completed) {
          // ignore
        });
      }
    }

    @profile
    public viewDidDisappear(animated: boolean): void {
        super.viewDidDisappear(animated);
        const owner = this._owner.get();
        if (owner && !owner.parent && owner.isLoaded && !this.presentedViewController) {
            owner.callUnloaded();
        }
    }

    public viewWillTransitionToSizeWithTransitionCoordinator(size: CGSize, coordinator: UIViewControllerTransitionCoordinator): void {
        super.viewWillTransitionToSizeWithTransitionCoordinator(size, coordinator);
        UIViewControllerTransitionCoordinator.prototype.animateAlongsideTransitionCompletion
            .call(coordinator, null, () => {
                const owner = this._owner.get();
                if (owner && owner.items) {
                    owner.items.forEach(tabItem => tabItem._updateTitleAndIconPositions());
                }
            });
    }

    // Mind implementation for other controllers
    public traitCollectionDidChange(previousTraitCollection: UITraitCollection): void {
        super.traitCollectionDidChange(previousTraitCollection);

        if (majorVersion >= 13) {
            const owner = this._owner.get();
            if (owner &&
                this.traitCollection.hasDifferentColorAppearanceComparedToTraitCollection &&
                this.traitCollection.hasDifferentColorAppearanceComparedToTraitCollection(previousTraitCollection)) {
                owner.notify({ eventName: iosView.traitCollectionColorAppearanceChangedEvent, object: owner });
            }
        }
    }
}

class UITabBarControllerDelegateImpl extends NSObject implements UITabBarControllerDelegate {
    public static ObjCProtocols = [UITabBarControllerDelegate];

    private _owner: WeakRef<TabView>;

    public static initWithOwner(owner: WeakRef<TabView>): UITabBarControllerDelegateImpl {
        let delegate = <UITabBarControllerDelegateImpl>UITabBarControllerDelegateImpl.new();
        delegate._owner = owner;

        return delegate;
    }

    public tabBarControllerShouldSelectViewController(tabBarController: UITabBarController, viewController: UIViewController): boolean {
      
        if (traceEnabled()) {
            traceWrite("TabView.delegate.SHOULD_select(" + tabBarController + ", " + viewController + ");", traceCategories.Debug);
        }

        let owner = this._owner.get();
        if (owner) {
            // "< More" cannot be visible after clicking on the main tab bar buttons.
            let backToMoreWillBeVisible = false;
            owner._handleTwoNavigationBars(backToMoreWillBeVisible);
        }

        if ((<any>tabBarController).selectedViewController === viewController) {
            return false;
        }
        
        /**
         * CROSS DISSOLVE TRANSITION
         */
        // const fromView = owner.ios.viewControllers.objectAtIndex(owner.selectedIndex).view;
        // const toView = viewController.view;
        // if (fromView !== toView) {
        //   let backgroundColor;
        //   switch (owner.selectedIndex) {
        //     case 0:
        //         backgroundColor = UIColor.colorWithRedGreenBlueAlpha(.93, .44, .73, 1);
        //         break;
        //     case 1:
        //         // backgroundColor = UIColor.colorWithRedGreenBlueAlpha(.28, .83, .98, 1);
        //         backgroundColor = UIColor.colorWithRedGreenBlueAlpha(.71, .36, .87, 1);
        //         break;
        //     case 2:
        //         backgroundColor = UIColor.colorWithRedGreenBlueAlpha(1, .8, .28, 1);
        //         break;
        //     case 3:
        //         backgroundColor = UIColor.colorWithRedGreenBlueAlpha(.15, .85, 1, 1);
        //         break;
        //     case 4:
        //         backgroundColor = UIColor.colorWithRedGreenBlueAlpha(.47, .95, .57, 1);
        //         break;
        //   }
        //   fromView.backgroundColor = backgroundColor;
        //   toView.backgroundColor = backgroundColor;

        //   // UIView.transitionFromViewToViewDurationOptionsCompletion(fromView, toView, .3, UIViewAnimationOptions.TransitionCrossDissolve, (finished: boolean) => {
        //   //   // ignore
        //   // });
        // }

        (<any>tabBarController)._willSelectViewController = viewController;

        return true;
    }

    public tabBarControllerDidSelectViewController(tabBarController: UITabBarController, viewController: UIViewController): void {
        if (traceEnabled()) {
            traceWrite("TabView.delegate.DID_select(" + tabBarController + ", " + viewController + ");", traceCategories.Debug);
        }

        const owner = this._owner.get();
        if (owner) {
            owner._onViewControllerShown(viewController);
        }
        (<any>tabBarController)._willSelectViewController = undefined;

        // experiment at one time:
        // const subView = owner.ios.tabBar.subviews.objectAtIndex(owner.selectedIndex + 1).subviews.firstObject;
        // // console.log('owner.ios.tabBar.subviews.count:', owner.ios.tabBar.subviews.count);
        // for (var i = 0; i < owner.ios.tabBar.subviews.count; i++) {
        //   if (i !== owner.selectedIndex && i < 5) { // i < 5 prevent a crash since we only want last item and there are a total of 6 items
        //     const item = owner.ios.tabBar.subviews.objectAtIndex(i+1).subviews.firstObject;
        //     item.alpha = .8;
        //     item.layer.shadowOpacity = 0;
        //   }
        // }

        // UIView.animateWithDurationDelayUsingSpringWithDampingInitialSpringVelocityOptionsAnimationsCompletion(
        //   .5,
        //   0,
        //   .5,
        //   .5,
        //   UIViewAnimationOptions.CurveEaseInOut,
        //   function() {

        //     const scale = CGAffineTransformMakeScale(1.4, 1.4);
        //     subView.transform = CGAffineTransformConcat(scale, CGAffineTransformMakeRotation(.2)); 
              
        //     subView.alpha = 1;
        //     subView.layer.masksToBounds = false;
        //     if (owner.selectedIndex === 0) {
        //       subView.layer.shadowColor = iosUtils.getter(UIColor, UIColor.whiteColor).CGColor;
        //       subView.layer.shadowOpacity = 1;
        //       subView.layer.shadowRadius = 2;
        //     } else {
        //       subView.layer.shadowColor = iosUtils.getter(UIColor, UIColor.blackColor).CGColor;
        //       subView.layer.shadowOpacity = 0.8;
        //       subView.layer.shadowRadius = 1.5;
        //     }
        //     subView.layer.cornerRadius = 3;//subView.frame.size.height/2;
        //     subView.layer.shadowOffset = CGSizeMake(0, 0);

        //     UIView.animateWithDurationDelayUsingSpringWithDampingInitialSpringVelocityOptionsAnimationsCompletion(
        //       .5,
        //       .2,
        //       .5,
        //       .5,
        //       UIViewAnimationOptions.CurveEaseInOut,
        //       function() {
        //         const scale = CGAffineTransformMakeScale(1, 1);
        //         subView.transform = CGAffineTransformConcat(scale, CGAffineTransformMakeRotation(0));
        //       },
        //       function(completed) {
        //         // ignore
        //       }
        //     );
        //   },
        //   function(completed) {
        //     // ignore
        //   }
        // );
    }
}

class UINavigationControllerDelegateImpl extends NSObject implements UINavigationControllerDelegate {
    public static ObjCProtocols = [UINavigationControllerDelegate];

    private _owner: WeakRef<TabView>;

    public static initWithOwner(owner: WeakRef<TabView>): UINavigationControllerDelegateImpl {
        let delegate = <UINavigationControllerDelegateImpl>UINavigationControllerDelegateImpl.new();
        delegate._owner = owner;

        return delegate;
    }

    navigationControllerWillShowViewControllerAnimated(navigationController: UINavigationController, viewController: UIViewController, animated: boolean): void {
        if (traceEnabled()) {
            traceWrite("TabView.moreNavigationController.WILL_show(" + navigationController + ", " + viewController + ", " + animated + ");", traceCategories.Debug);
        }

        let owner = this._owner.get();
        if (owner) {
            // If viewController is one of our tab item controllers, then "< More" will be visible shortly.
            // Otherwise viewController is the UIMoreListController which shows the list of all tabs beyond the 4th tab.
            let backToMoreWillBeVisible = owner._ios.viewControllers.containsObject(viewController);
            owner._handleTwoNavigationBars(backToMoreWillBeVisible);
        }
    }

    navigationControllerDidShowViewControllerAnimated(navigationController: UINavigationController, viewController: UIViewController, animated: boolean): void {
        if (traceEnabled()) {
            traceWrite("TabView.moreNavigationController.DID_show(" + navigationController + ", " + viewController + ", " + animated + ");", traceCategories.Debug);
        }
        // We don't need Edit button in More screen.
        navigationController.navigationBar.topItem.rightBarButtonItem = null;
        let owner = this._owner.get();
        if (owner) {
            owner._onViewControllerShown(viewController);
        }
    }
}

function updateTitleAndIconPositions(tabItem: TabViewItem, tabBarItem: UITabBarItem, controller: UIViewController) {
    if (!tabItem || !tabBarItem) {
        return;
    }

    // For iOS <11 icon is *always* above the text.
    // For iOS 11 icon is above the text *only* on phones in portrait mode.
    const orientation = controller.interfaceOrientation;
    const isPortrait = orientation !== UIInterfaceOrientation.LandscapeLeft && orientation !== UIInterfaceOrientation.LandscapeRight;
    const isIconAboveTitle = (majorVersion < 11) || (isPhone && isPortrait);

    if (!tabItem.iconSource) {
        if (isIconAboveTitle) {
            tabBarItem.titlePositionAdjustment = { horizontal: 0, vertical: -20 };
        } else {
            tabBarItem.titlePositionAdjustment = { horizontal: 0, vertical: 0 };
        }
    }

    if (!tabItem.title) {
        if (isIconAboveTitle) {
          if (isIPhoneX) {
            // tabBarItem.imageInsets = new UIEdgeInsets({ top: 20, left: 0, bottom: -20, right: 0 });
            tabBarItem.imageInsets = new UIEdgeInsets({ top: 6, left: 0, bottom: -6, right: 0 });
          } else {
            tabBarItem.imageInsets = new UIEdgeInsets({ top: 12, left: 0, bottom: -12, right: 0 });
          }
        } else {
            tabBarItem.imageInsets = new UIEdgeInsets({ top: 0, left: 0, bottom: 0, right: 0 });
        }
    }
}

export class TabViewItem extends TabViewItemBase {
    private __controller: UIViewController;

    public setViewController(controller: UIViewController, nativeView: UIView) {
        this.__controller = controller;
        this.setNativeView(nativeView);
    }

    public disposeNativeView() {
        this.__controller = undefined;
        this.setNativeView(undefined);
    }

    public loadView(view: ViewBase): void {
        const tabView = this.parent as TabViewBase;
        if (tabView && tabView.items) {
            const index = tabView.items.indexOf(this);

            if (index === tabView.selectedIndex) {
                super.loadView(view);
            }
        }
    }

    public _update() {
        const parent = <TabView>this.parent;
        const controller = this.__controller;
        if (parent && controller) {
            const icon = parent._getIcon(this.iconSource);
            const index = parent.items.indexOf(this);
            const title = getTransformedText(this.title, this.style.textTransform);

            const tabBarItem = UITabBarItem.alloc().initWithTitleImageTag(title, icon, index);
            // THIS LINE IS MAGIC (AVOIDS creating new tabbaritems each time you change selected image!!)
            tabBarItem.selectedImage = parent._getIcon(this.iconSource + "_selected");
            updateTitleAndIconPositions(this, tabBarItem, controller);

            // const subView = parent.ios.tabBar.subviews.objectAtIndex(index).subviews.firstObject;
            // TODO: Repeating code. Make TabViewItemBase - ViewBase and move the colorProperty on tabViewItem.
            // Delete the repeating code.
            const states = getTitleAttributesForStates(parent);
            applyStatesToItem(tabBarItem, states);
            controller.tabBarItem = tabBarItem;
        }
    }

    public _updateTitleAndIconPositions() {
        if (!this.__controller || !this.__controller.tabBarItem) {
            return;
        }
        updateTitleAndIconPositions(this, this.__controller.tabBarItem, this.__controller);
    }

    [textTransformProperty.setNative](value: TextTransform) {
        this._update();
    }
}

export class TabView extends TabViewBase {
    public viewController: UITabBarControllerImpl;
    public items: TabViewItem[];
    public _ios: UITabBarControllerImpl;
    private _delegate: UITabBarControllerDelegateImpl;
    private _moreNavigationControllerDelegate: UINavigationControllerDelegateImpl;
    private _iconsCache = {};

    constructor() {
        super();
        checkIsIPhoneX();
        this.viewController = this._ios = UITabBarControllerImpl.initWithOwner(new WeakRef(this));
        this.nativeViewProtected = this._ios.view;
    }

    initNativeView() {
        super.initNativeView();
        this._delegate = UITabBarControllerDelegateImpl.initWithOwner(new WeakRef(this));
        this._moreNavigationControllerDelegate = UINavigationControllerDelegateImpl.initWithOwner(new WeakRef(this));
    }

    disposeNativeView() {
        this._delegate = null;
        this._moreNavigationControllerDelegate = null;
        super.disposeNativeView();
    }

    @profile
    public onLoaded() {
        super.onLoaded();

        const selectedIndex = this.selectedIndex;
        const selectedView = this.items && this.items[selectedIndex] && this.items[selectedIndex].view;
        if (selectedView instanceof Frame) {
            selectedView._pushInFrameStackRecursive();
        }

        this._ios.delegate = this._delegate;
    }

    public onUnloaded() {
        this._ios.delegate = null;
        this._ios.moreNavigationController.delegate = null;
        super.onUnloaded();
    }

    get ios(): UITabBarController {
        return this._ios;
    }

    public layoutNativeView(left: number, top: number, right: number, bottom: number): void {
        //
    }

    public _setNativeViewFrame(nativeView: UIView, frame: CGRect) {
        //
    }

    public onSelectedIndexChanged(oldIndex: number, newIndex: number): void {
        const items = this.items;
        if (!items) {
            return;
        }

        const oldItem = items[oldIndex];
        if (oldItem) {
            oldItem.unloadView(oldItem.view);
        }

        const newItem = items[newIndex];
        if (newItem && this.isLoaded) {
            const selectedView = items[newIndex].view;
            if (selectedView instanceof Frame) {
                selectedView._pushInFrameStackRecursive();
            }

            newItem.loadView(newItem.view);
        }

        super.onSelectedIndexChanged(oldIndex, newIndex);
    }

    public onMeasure(widthMeasureSpec: number, heightMeasureSpec: number): void {
        const width = layout.getMeasureSpecSize(widthMeasureSpec);
        const widthMode = layout.getMeasureSpecMode(widthMeasureSpec);

        const height = layout.getMeasureSpecSize(heightMeasureSpec);
        const heightMode = layout.getMeasureSpecMode(heightMeasureSpec);

        const widthAndState = View.resolveSizeAndState(width, width, widthMode, 0);
        const heightAndState = View.resolveSizeAndState(height, height, heightMode, 0);

        this.setMeasuredDimension(widthAndState, heightAndState);
    }

    public _onViewControllerShown(viewController: UIViewController) {
        // This method could be called with the moreNavigationController or its list controller, so we have to check.
        if (traceEnabled()) {
            traceWrite("TabView._onViewControllerShown(" + viewController + ");", traceCategories.Debug);
        }
        if (this._ios.viewControllers && this._ios.viewControllers.containsObject(viewController)) {
            this.selectedIndex = this._ios.viewControllers.indexOfObject(viewController);
        } else {
            if (traceEnabled()) {
                traceWrite("TabView._onViewControllerShown: viewController is not one of our viewControllers", traceCategories.Debug);
            }
        }
    }

    private _actionBarHiddenByTabView: boolean;
    public _handleTwoNavigationBars(backToMoreWillBeVisible: boolean) {
        if (traceEnabled()) {
            traceWrite(`TabView._handleTwoNavigationBars(backToMoreWillBeVisible: ${backToMoreWillBeVisible})`, traceCategories.Debug);
        }

        // The "< Back" and "< More" navigation bars should not be visible simultaneously.
        const page = this.page || this._selectedView.page || (<any>this)._selectedView.currentPage;
        if (!page || !page.frame) {
            return;
        }

        let actionBarVisible = page.frame._getNavBarVisible(page);

        if (backToMoreWillBeVisible && actionBarVisible) {
            page.frame.ios._disableNavBarAnimation = true;
            page.actionBarHidden = true;
            page.frame.ios._disableNavBarAnimation = false;
            this._actionBarHiddenByTabView = true;
            if (traceEnabled()) {
                traceWrite(`TabView hid action bar`, traceCategories.Debug);
            }

            return;
        }

        if (!backToMoreWillBeVisible && this._actionBarHiddenByTabView) {
            page.frame.ios._disableNavBarAnimation = true;
            page.actionBarHidden = false;
            page.frame.ios._disableNavBarAnimation = false;
            this._actionBarHiddenByTabView = undefined;
            if (traceEnabled()) {
                traceWrite(`TabView restored action bar`, traceCategories.Debug);
            }

            return;
        }
    }

    private getViewController(item: TabViewItem): UIViewController {
        let newController: UIViewController = item.view ? item.view.viewController : null;

        if (newController) {
            item.setViewController(newController, newController.view);

            return newController;
        }

        if (item.view.ios instanceof UIViewController) {
            newController = item.view.ios;
            item.setViewController(newController, newController.view);
        } else if (item.view.ios && item.view.ios.controller instanceof UIViewController) {
            newController = item.view.ios.controller;
            item.setViewController(newController, newController.view);
        } else {
            newController = iosView.UILayoutViewController.initWithOwner(new WeakRef(item.view)) as UIViewController;
            newController.view.addSubview(item.view.nativeViewProtected);
            item.view.viewController = newController;
            item.setViewController(newController, item.view.nativeViewProtected);
        }

        return newController;
    }

    private setViewControllers(items: TabViewItem[]) {
        const length = items ? items.length : 0;
        if (length === 0) {
            this._ios.viewControllers = null;

            return;
        }

        const controllers = NSMutableArray.alloc<UIViewController>().initWithCapacity(length);
        const states = getTitleAttributesForStates(this);

        items.forEach((item, i) => {
            const controller = this.getViewController(item);
            const icon = this._getIcon(item.iconSource);
            const tabBarItem = UITabBarItem.alloc().initWithTitleImageTag((item.title || ""), icon, i);
            updateTitleAndIconPositions(item, tabBarItem, controller);

            applyStatesToItem(tabBarItem, states);

            controller.tabBarItem = tabBarItem;
            controllers.addObject(controller);
            (<TabViewItemDefinition>item).canBeLoaded = true;
        });

        this._ios.viewControllers = controllers;
        this._ios.customizableViewControllers = null;

        // When we set this._ios.viewControllers, someone is clearing the moreNavigationController.delegate, so we have to reassign it each time here.
        this._ios.moreNavigationController.delegate = this._moreNavigationControllerDelegate;
    }

    private _getIconRenderingMode(): UIImageRenderingMode {
        switch (this.iosIconRenderingMode) {
            case "alwaysOriginal":
                return UIImageRenderingMode.AlwaysOriginal;
            case "alwaysTemplate":
                return UIImageRenderingMode.AlwaysTemplate;
            case "automatic":
            default:
                return UIImageRenderingMode.Automatic;
        }
    }

    public _getIcon(iconSource: string): UIImage {
        if (!iconSource) {
            return null;
        }

        let image: UIImage = this._iconsCache[iconSource];
        if (!image) {
            const is = ImageSource.fromFileOrResourceSync(iconSource);
            if (is && is.ios) {
                const originalRenderedImage = is.ios.imageWithRenderingMode(this._getIconRenderingMode());
                this._iconsCache[iconSource] = originalRenderedImage;
                image = originalRenderedImage;
            } else {
                traceMissingIcon(iconSource);
            }
        }

        return image;
    }

    private _updateIOSTabBarColorsAndFonts(): void {
        if (!this.items) {
            return;
        }

        const tabBar = <UITabBar>this.ios.tabBar;
        const states = getTitleAttributesForStates(this);
        for (let i = 0; i < tabBar.items.count; i++) {
            applyStatesToItem(tabBar.items[i], states);
        }
    }

    [selectedIndexProperty.setNative](value: number) {
        if (traceEnabled()) {
            traceWrite("TabView._onSelectedIndexPropertyChangedSetNativeValue(" + value + ")", traceCategories.Debug);
        }

        if (value > -1) {
            (<any>this._ios)._willSelectViewController = this._ios.viewControllers[value];
            this._ios.selectedIndex = value;
        }
    }

    [itemsProperty.getDefault](): TabViewItem[] {
        return null;
    }
    [itemsProperty.setNative](value: TabViewItem[]) {
        this.setViewControllers(value);
        selectedIndexProperty.coerce(this);
    }

    [tabTextFontSizeProperty.getDefault](): number {
        return null;
    }
    [tabTextFontSizeProperty.setNative](value: number | { nativeSize: number }) {
        this._updateIOSTabBarColorsAndFonts();
    }

    [tabTextColorProperty.getDefault](): UIColor {
        return null;
    }
    [tabTextColorProperty.setNative](value: UIColor | Color) {
        this._updateIOSTabBarColorsAndFonts();
    }

    // NOTE: disabling barTintColor access completely since using custom gradient backgroundImage
    // [tabBackgroundColorProperty.getDefault](): UIColor {
    //     return this._ios.tabBar.barTintColor;
    // }
    // [tabBackgroundColorProperty.setNative](value: UIColor | Color) {
    //     this._ios.tabBar.barTintColor = value instanceof Color ? value.ios : value;
    // }

    [selectedTabTextColorProperty.getDefault](): UIColor {
        return this._ios.tabBar.tintColor;
    }
    [selectedTabTextColorProperty.setNative](value: UIColor) {
        this._ios.tabBar.tintColor = value instanceof Color ? value.ios : value;
        this._updateIOSTabBarColorsAndFonts();
    }

    /**
     * Support tabGradients
     */
    [tabGradientsProperty.getDefault] () {
      return this._ios.tabGradients;
    }
    [tabGradientsProperty.setNative](value) {
        // console.log('tabGradients:', value);
        // NOTE: should be this only:
        // if (value) {
        //   this._ios.tabGradients = value;
        // }
        // NOTE: valueConverted should work on Property but doesn't seem to be
        let tabGradientColors; // used for background color tab switch animation
        let tabGradients;
        if (Array.isArray(value)) {
          tabGradientColors = [];
          tabGradients = [];
          // convert to cgColor
          for (let i = 0; i < value.length; i++) {
            const tabColors = value[i];
            // console.log('tabColors:', tabColors);
            const convertedColors = [];
            const convertedGradients = [];
            for (let c = 0; c < tabColors.length; c++) {
              const color = new Color(tabColors[c]).ios;
              convertedColors.push(color);
              convertedGradients.push(color.CGColor);
            }
            // console.log('converted:', converted);
            tabGradientColors.push(convertedColors);
            tabGradients.push(convertedGradients);
          }
        }
        if (tabGradients) {
          this._ios.tabGradientColors = tabGradientColors;
          this._ios.tabGradients = tabGradients;
        }
    }
    /**
     * End tabGradients
     */

    // TODO: Move this to TabViewItem
    [fontInternalProperty.getDefault](): Font {
        return null;
    }
    [fontInternalProperty.setNative](value: Font) {
        this._updateIOSTabBarColorsAndFonts();
    }

    // TODO: Move this to TabViewItem
    [iosIconRenderingModeProperty.getDefault](): "automatic" | "alwaysOriginal" | "alwaysTemplate" {
        return "automatic";
    }
    [iosIconRenderingModeProperty.setNative](value: "automatic" | "alwaysOriginal" | "alwaysTemplate") {
        this._iconsCache = {};
        let items = this.items;
        if (items && items.length) {
            for (let i = 0, length = items.length; i < length; i++) {
                const item = items[i];
                if (item.iconSource) {
                    (<TabViewItem>item)._update();
                }
            }
        }
    }
}

interface TabStates {
    normalState?: any;
    selectedState?: any;
}

function getTitleAttributesForStates(tabView: TabView): TabStates {
    const result: TabStates = {};

    const defaultTabItemFontSize = 10;
    const tabItemFontSize = tabView.style.tabTextFontSize || defaultTabItemFontSize;
    const font: UIFont = tabView.style.fontInternal.getUIFont(UIFont.systemFontOfSize(tabItemFontSize));
    const tabItemTextColor = tabView.style.tabTextColor;
    const textColor = tabItemTextColor instanceof Color ? tabItemTextColor.ios : null;
    result.normalState = { [NSFontAttributeName]: font };
    if (textColor) {
        result.normalState[UITextAttributeTextColor] = textColor;
    }

    const tabSelectedItemTextColor = tabView.style.selectedTabTextColor;
    const selectedTextColor = tabSelectedItemTextColor instanceof Color ? tabSelectedItemTextColor.ios : null;
    result.selectedState = { [NSFontAttributeName]: font };
    if (selectedTextColor) {
        result.selectedState[UITextAttributeTextColor] = selectedTextColor;
    }

    return result;
}

function applyStatesToItem(item: UITabBarItem, states: TabStates) {
    item.setTitleTextAttributesForState(states.normalState, UIControlState.Normal);
    item.setTitleTextAttributesForState(states.selectedState, UIControlState.Selected);
}
