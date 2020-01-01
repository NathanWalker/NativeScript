// imported for definition purposes only
import * as httpRequestModule from "../../http/http-request";

import * as common from "./image-cache-common";
import * as trace from "../../trace";
import * as utils from "../../utils/utils";
import { knownFolders, File, path } from "../../file-system";
import { getString, setString } from "../../application-settings";

let httpRequest: typeof httpRequestModule;
function ensureHttpRequest() {
    if (!httpRequest) {
        httpRequest = require("../../http/http-request");
    }
}
const background_queue = dispatch_get_global_queue(qos_class_t.QOS_CLASS_DEFAULT, 0);

// class MemmoryWarningHandler extends NSObject {
//     static new(): MemmoryWarningHandler {
//         return <MemmoryWarningHandler>super.new();
//     }

//     private _cache: NSCache<any, any>;

//     public initWithCache(cache: NSCache<any, any>): MemmoryWarningHandler {
//         this._cache = cache;

//         // NSNotificationCenter.defaultCenter.addObserverSelectorNameObject(this, "clearCache", "UIApplicationDidReceiveMemoryWarningNotification", null);
//         // if (trace.isEnabled()) {
//         //     trace.write("[MemmoryWarningHandler] Added low memory observer.", trace.categories.Debug);
//         // }

//         return this;
//     }

//     public dealloc(): void {
//         // NSNotificationCenter.defaultCenter.removeObserverNameObject(this, "UIApplicationDidReceiveMemoryWarningNotification", null);
//         // if (trace.isEnabled()) {
//         //     trace.write("[MemmoryWarningHandler] Removed low memory observer.", trace.categories.Debug);
//         // }
//         super.dealloc();
//     }

//     public clearCache(): void {
//         if (trace.isEnabled()) {
//             trace.write("[MemmoryWarningHandler] Clearing Image Cache.", trace.categories.Debug);
//         }
//         this._cache.removeAllObjects();
//         utils.GC();
//     }

//     public static ObjCExposedMethods = {
//         "clearCache": { returns: interop.types.void, params: [] }
//     };
// }

export class Cache extends common.Cache {
    private _cache: NSCache<any, any>;
    private _savedImages: { [url: string]: {
      date: number;
      requests: number;
      localPath?: string;
    }
  };

    //@ts-ignore
    // private _memoryWarningHandler: MemmoryWarningHandler;

    constructor() {
        super();

        this._cache = new NSCache<any, any>();

        // this._memoryWarningHandler = MemmoryWarningHandler.new().initWithCache(this._cache);
        const stored = getString(common.SaveImageStorageKey);
        if (stored) {
          try {
            this._savedImages = JSON.parse(stored);
          } catch (err) {
            // ignore
          }
        }
        if (!this._savedImages) {
          this._savedImages = {};
        }
    }

    public _downloadCore(request: common.DownloadRequest) {
        ensureHttpRequest();

        let imageSetting;
        let requests: number = 0;
        if (this.saveFile && !request.ignoreCacheFileSave) {
            imageSetting = this._savedImages[request.url];
            requests = imageSetting ? imageSetting.requests : 0;
            if (imageSetting && imageSetting.localPath && File.exists(imageSetting.localPath)) {
              const data = File.fromPath(imageSetting.localPath).readSync(function(err) {
                if (this.debug) {
                  console.log("image cache file path read error:", err);
                }
              });
              if (data) {
                const image = UIImage.alloc().initWithData(data);
                if (image) {
                  this._onDownloadCompleted(request.key, image);
                  // this.set(request.key, image);
                  if (this.debug) {
                      console.log("used image from file cache for: ", request.key, " localPath: ", imageSetting.localPath);
                  }

                  return;
                } else if (this.debug) {
                  console.log("could not create UIImage from file data.");
                }
              } else if (this.debug) {
                console.log("data was not defined from readSync.");
              }
          }
        }

        httpRequest.request({ url: request.url, method: "GET" })
            .then((response) => {
                try {
                    const image = UIImage.alloc().initWithData(response.content.raw);
                    
                    if (this.saveFile && !request.ignoreCacheFileSave) {
                      let filename = common.fileNameFromPath(request.url);
                      if (filename.indexOf("?") > -1) {
                        // strip any params if were any
                        filename = filename.split("?")[0];
                      }
                      const localPath = path.join(knownFolders.documents().path, `${Date.now()}_${filename}`);
                      dispatch_async(background_queue, () => {
                        try {
                            response.content.raw.writeToFileAtomically(localPath, true);
                            // utils.releaseNativeObject(response.content.raw);   
                            if (this.debug) {
                                console.log("wrote image to file:", localPath);
                            }
                        } catch (e) {
                          if (this.debug) {
                            console.log("error writing image to file:", e);
                          }
                        }
                      });
                      this._savedImages[request.url] = {
                        ...(imageSetting || {}),
                        date: Date.now(),
                        requests: requests + 1,
                        localPath
                      };
                      setString(common.SaveImageStorageKey, JSON.stringify(this._savedImages));
                    }

                    if (image) {
                        this._onDownloadCompleted(request.key, image);
                    } else {
                        this._onDownloadError(request.key, new Error("No result for provided url"));
                    }
                } catch (err) {
                    this._onDownloadError(request.key, err);
                }
            }, (err) => {
                this._onDownloadError(request.key, err);
            });
    }

    public get(key: string): any {
        return this._cache.objectForKey(key);
    }

    public set(key: string, image: any): void {
        this._cache.setObjectForKey(image, key);
    }

    public remove(key: string): void {
        this._cache.removeObjectForKey(key);
    }

    public clear() {
        this._cache.removeAllObjects();
        utils.GC();
    }
}
