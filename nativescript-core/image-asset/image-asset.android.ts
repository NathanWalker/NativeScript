import { ImageAssetBase, getRequestedImageSize } from "./image-asset-common";
import { path as fsPath, knownFolders } from "../file-system";
import { ad } from '../utils/utils';
import { screen } from '../platform';
declare var androidx;
export * from "./image-asset-common";

export class ImageAsset extends ImageAssetBase {
    private _android: string; //file name of the image

    constructor(asset: string) {
        super();
        let fileName = typeof asset === "string" ? asset.trim() : "";
        if (fileName.indexOf("~/") === 0) {
            fileName = fsPath.join(knownFolders.currentApp().path, fileName.replace("~/", ""));
        }
        this.android = fileName;
    }

    get android(): string {
        return this._android;
    }

    set android(value: string) {
        this._android = value;
    }

    public getImageAsync(callback: (image, error) => void) {
        org.nativescript.widgets.Utils.loadImageAsync(
			ad.getApplicationContext(),
			this.android,
			JSON.stringify(this.options || {}),
			screen.mainScreen.widthPixels,
			screen.mainScreen.heightPixels,
			new org.nativescript.widgets.Utils.AsyncImageCallback({
				onSuccess(bitmap) {
					callback(bitmap, null);
				},
				onError(ex) {
					callback(null, ex);
				},
			})
		);
    }
}