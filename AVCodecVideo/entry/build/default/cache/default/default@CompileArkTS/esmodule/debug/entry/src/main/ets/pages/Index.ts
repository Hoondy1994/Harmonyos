if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface Player_Params {
    buttonEnabled?: boolean;
    isShow?: boolean;
    cameraData?: CameraDataModel;
    selectFilePath?: string | null;
    display?;
    heightPx?;
}
import fileIo from "@ohos:file.fs";
import display from "@ohos:display";
import camera from "@ohos:multimedia.camera";
import photoAccessHelper from "@ohos:file.photoAccessHelper";
import player from "@app:com.samples.AVCodecSample/entry/player";
import recorder from "@app:com.samples.AVCodecSample/entry/recorder";
import Logger from "@bundle:com.samples.AVCodecSample/entry/ets/common/utils/Logger";
import DateTimeUtil from "@bundle:com.samples.AVCodecSample/entry/ets/common/utils/DateTimeUtils";
import { CommonConstants as Const } from "@bundle:com.samples.AVCodecSample/entry/ets/common/CommonConstants";
import { CameraDataModel } from "@bundle:com.samples.AVCodecSample/entry/ets/model/CameraDateModel";
import { videoProfileCheck } from "@bundle:com.samples.AVCodecSample/entry/ets/common/utils/CameraCheck";
const TAG: string = Const.INDEX_TAG;
const DATETIME: DateTimeUtil = new DateTimeUtil();
class Player extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__buttonEnabled = new ObservedPropertySimplePU(true, this, "buttonEnabled");
        this.__isShow = new ObservedPropertySimplePU(false, this, "isShow");
        this.cameraData = new CameraDataModel();
        this.selectFilePath = null;
        this.display = display.getDefaultDisplaySync();
        this.heightPx = (this.display.width * Const.DEFAULT_HEIGHT / Const.DEFAULT_WIDTH) + Const.PX;
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: Player_Params) {
        if (params.buttonEnabled !== undefined) {
            this.buttonEnabled = params.buttonEnabled;
        }
        if (params.isShow !== undefined) {
            this.isShow = params.isShow;
        }
        if (params.cameraData !== undefined) {
            this.cameraData = params.cameraData;
        }
        if (params.selectFilePath !== undefined) {
            this.selectFilePath = params.selectFilePath;
        }
        if (params.display !== undefined) {
            this.display = params.display;
        }
        if (params.heightPx !== undefined) {
            this.heightPx = params.heightPx;
        }
    }
    updateStateVars(params: Player_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__buttonEnabled.purgeDependencyOnElmtId(rmElmtId);
        this.__isShow.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__buttonEnabled.aboutToBeDeleted();
        this.__isShow.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __buttonEnabled: ObservedPropertySimplePU<boolean>;
    get buttonEnabled() {
        return this.__buttonEnabled.get();
    }
    set buttonEnabled(newValue: boolean) {
        this.__buttonEnabled.set(newValue);
    }
    private __isShow: ObservedPropertySimplePU<boolean>;
    get isShow() {
        return this.__isShow.get();
    }
    set isShow(newValue: boolean) {
        this.__isShow.set(newValue);
    }
    private cameraData: CameraDataModel;
    private selectFilePath: string | null;
    private display;
    private heightPx;
    selectFile() {
        let photoPicker = new photoAccessHelper.PhotoViewPicker();
        photoPicker.select({
            MIMEType: photoAccessHelper.PhotoViewMIMETypes.VIDEO_TYPE,
            maxSelectNumber: 1
        })
            .then((photoSelectResult) => {
            this.selectFilePath = photoSelectResult.photoUris[0];
            if (this.selectFilePath === null) {
                this.getUIContext().getPromptAction().showToast({
                    message: { "id": 16777220, "type": 10003, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" },
                    duration: Const.DURATION,
                    bottom: Const.BOTTOM
                });
            }
            else {
                this.play();
                Logger.info(TAG, 'documentViewPicker.select to file succeed and URI is:' + this.selectFilePath);
            }
        });
    }
    play() {
        let inputFile = fileIo.openSync(this.selectFilePath, fileIo.OpenMode.READ_ONLY);
        if (!inputFile) {
            Logger.error(TAG, 'player inputFile is null');
        }
        let inputFileState = fileIo.statSync(inputFile.fd);
        if (inputFileState.size <= 0) {
            Logger.error(TAG, 'player inputFile size is 0');
        }
        this.buttonEnabled = false;
        player.playNative(inputFile.fd, Const.DEFAULT_VALUE, inputFileState.size, () => {
            Logger.info(TAG, 'player JSCallback');
            this.buttonEnabled = true;
            fileIo.close(inputFile);
        });
    }
    async checkIsProfileSupport(): Promise<void> {
        let cameraManager: camera.CameraManager = camera.getCameraManager(this.getUIContext().getHostContext());
        if (!cameraManager) {
            Logger.error(TAG, 'camera.getCameraManager error!');
        }
        let videoProfile: undefined | camera.VideoProfile = videoProfileCheck(cameraManager, this.cameraData);
        if (!videoProfile) {
            Logger.error(TAG, 'videoProfile is not found');
            this.getUIContext().getPromptAction().showToast({
                message: { "id": 16777221, "type": 10003, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" },
                duration: Const.DURATION,
                bottom: Const.BOTTOM,
                backgroundColor: Color.White,
                backgroundBlurStyle: BlurStyle.NONE
            });
            this.cameraData = new CameraDataModel();
            return;
        }
    }
    SettingButton(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithChild();
            Button.width({ "id": 16777246, "type": 10002, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" });
            Button.height({ "id": 16777244, "type": 10002, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" });
            Button.type(ButtonType.Circle);
            Button.backgroundColor({ "id": 16777233, "type": 10001, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" });
            Button.margin({ right: { "id": 16777245, "type": 10002, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" } });
            Button.onClick(() => {
                this.getUIContext().showTextPickerDialog({
                    defaultPickerItemHeight: Const.DEFAULT_PICKER_ITEM_HEIGHT,
                    selectedTextStyle: ({
                        font: ({
                            size: Const.SELECTED_TEXT_STYLE_FONT_SIZE
                        })
                    }),
                    range: Const.RECORDER_INFO,
                    canLoop: false,
                    alignment: DialogAlignment.Center,
                    backgroundColor: Color.White,
                    backgroundBlurStyle: BlurStyle.BACKGROUND_ULTRA_THICK,
                    onAccept: (value: TextPickerResult) => {
                        switch (value.value[0]) {
                            case Const.VIDEO_MIMETYPE[0]: {
                                this.cameraData.setCodecFormat(Const.TRUE, Const.MIME_VIDEO_HEVC);
                                break;
                            }
                            case Const.VIDEO_MIMETYPE[1]: {
                                this.cameraData.setCodecFormat(Const.FALSE, Const.MIME_VIDEO_AVC);
                                break;
                            }
                            case Const.VIDEO_MIMETYPE[2]: {
                                this.cameraData.setCodecFormat(Const.FALSE, Const.MIME_VIDEO_HEVC);
                                break;
                            }
                            default:
                                break;
                        }
                        switch (value.value[1]) {
                            case Const.VIDEO_RESOLUTION[0]: {
                                this.cameraData.setResolution(Const.VIDEO_WIDTH_4K, Const.VIDEO_HEIGHT_4K, Const.BITRATE_VIDEO_30M);
                                break;
                            }
                            case Const.VIDEO_RESOLUTION[1]: {
                                this.cameraData.setResolution(Const.VIDEO_WIDTH_1080P, Const.VIDEO_HEIGHT_1080P, Const.BITRATE_VIDEO_20M);
                                break;
                            }
                            case Const.VIDEO_RESOLUTION[2]: {
                                this.cameraData.setResolution(Const.VIDEO_WIDTH_720P, Const.VIDEO_HEIGHT_720P, Const.BITRATE_VIDEO_10M);
                                break;
                            }
                            default:
                                break;
                        }
                        switch (value.value[2]) {
                            case Const.VIDEO_FRAMERATE[0]: {
                                this.cameraData.frameRate = Const.FRAMERATE_VIDEO_30FPS;
                                break;
                            }
                            case Const.VIDEO_FRAMERATE[1]: {
                                this.cameraData.frameRate = Const.FRAMERATE_VIDEO_60FPS;
                                break;
                            }
                            default:
                                break;
                        }
                        this.checkIsProfileSupport();
                    }
                });
            });
        }, Button);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777253, "type": 20000, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" });
            Image.width({ "id": 16777248, "type": 10002, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" });
            Image.height({ "id": 16777247, "type": 10002, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" });
        }, Image);
        Button.pop();
    }
    Authorized(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.justifyContent(FlexAlign.End);
            Column.padding({ left: '16vp', right: '16vp' });
            Column.width('100%');
            Column.height('100%');
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create({ "id": 16777231, "type": 10003, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" });
            Text.width('100%');
            Text.fontSize('16vp');
            Text.margin({ bottom: '12vp' });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.justifyContent(FlexAlign.SpaceAround);
            Row.alignItems(VerticalAlign.Bottom);
            Row.margin({ bottom: '44vp' });
            Row.width('100%');
            Row.height('52vp');
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel({ "id": 16777230, "type": 10003, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" });
            Button.onClick(() => {
                this.isShow = false;
            });
            Button.width('48%');
        }, Button);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Blank.create();
        }, Blank);
        Blank.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            SaveButton.create({ text: SaveDescription.SAVE });
            SaveButton.onClick(async () => {
                const context = this.getUIContext().getHostContext();
                let helper = photoAccessHelper.getPhotoAccessHelper(context);
                let uri = await helper.createAsset(photoAccessHelper.PhotoType.VIDEO, 'mp4', {
                    title: `AVCodecVideo_${DATETIME.getDate()}_${DATETIME.getTime()}`
                });
                let file = await fileIo.open(uri, fileIo.OpenMode.READ_WRITE | fileIo.OpenMode.CREATE);
                this.cameraData.outputfd = file.fd;
                if (this.cameraData.outputfd !== null) {
                    recorder.initNative(this.cameraData.outputfd, this.cameraData.videoCodecMime, this.cameraData.cameraWidth, this.cameraData.cameraHeight, this.cameraData.frameRate, this.cameraData.isHDRVivid, this.cameraData.bitRate).then((data) => {
                        if (data.surfaceId !== null) {
                            this.cameraData.surfaceId = data.surfaceId;
                            this.getUIContext().getRouter().pushUrl({
                                url: 'pages/Recorder',
                                params: this.cameraData
                            });
                        }
                    });
                }
                else {
                    Logger.error(TAG, 'get outputfd failed!');
                }
            });
            SaveButton.width('48%');
            SaveButton.height('40vp');
        }, SaveButton);
        Row.pop();
        Column.pop();
    }
    Window(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.alignRules({
                'top': { 'anchor': '__container__', 'align': VerticalAlign.Top },
                'left': { 'anchor': '__container__', 'align': HorizontalAlign.Start }
            });
            Row.margin({ top: { "id": 16777251, "type": 10002, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" } });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            XComponent.create({
                id: 'player',
                type: XComponentType.SURFACE,
                libraryname: 'player'
            }, "com.samples.AVCodecSample/entry");
            XComponent.height(this.heightPx);
            XComponent.width(Const.FULL_SIZE);
        }, XComponent);
        Row.pop();
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            RelativeContainer.create();
            RelativeContainer.width({ "id": 16777224, "type": 10003, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" });
            RelativeContainer.height({ "id": 16777223, "type": 10003, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" });
        }, RelativeContainer);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width({ "id": 16777224, "type": 10003, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" });
            Row.height({ "id": 16777249, "type": 10002, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" });
            Row.margin({ top: { "id": 16777250, "type": 10002, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" } });
            Row.justifyContent(FlexAlign.End);
            Row.alignRules({
                'top': { 'anchor': '__container__', 'align': VerticalAlign.Top },
                'left': { 'anchor': '__container__', 'align': HorizontalAlign.Start }
            });
        }, Row);
        this.SettingButton.bind(this)();
        Row.pop();
        this.Window.bind(this)();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.alignRules({
                'bottom': { 'anchor': '__container__', 'align': VerticalAlign.Bottom },
                'left': { 'anchor': '__container__', 'align': HorizontalAlign.Start }
            });
            Column.padding({ left: '16vp', right: '16vp', bottom: '16vp' });
            Column.width({ "id": 16777224, "type": 10003, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" });
            Column.height({ "id": 16777238, "type": 10002, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" });
            Column.justifyContent(FlexAlign.End);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel(this.buttonEnabled ? { "id": 16777226, "type": 10003, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" } : { "id": 16777227, "type": 10003, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" });
            Button.onClick(() => {
                this.selectFile();
            });
            Button.size({
                width: '100%',
                height: { "id": 16777236, "type": 10002, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" }
            });
            Button.enabled(this.buttonEnabled);
            Button.margin({ bottom: { "id": 16777235, "type": 10002, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" } });
        }, Button);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel({ "id": 16777229, "type": 10003, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" });
            Button.onClick(() => {
                this.isShow = true;
            });
            Button.bindSheet({ value: this.isShow, changeEvent: newValue => { this.isShow = newValue; } }, { builder: this.Authorized.bind(this) }, {
                height: 210,
                title: {
                    title: { "id": 16777232, "type": 10003, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" }
                }
            });
            Button.size({
                width: '100%',
                height: { "id": 16777236, "type": 10002, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" }
            });
            Button.enabled(this.buttonEnabled);
        }, Button);
        Button.pop();
        Column.pop();
        RelativeContainer.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "Player";
    }
}
registerNamedRoute(() => new Player(undefined, {}), "", { bundleName: "com.samples.AVCodecSample", moduleName: "entry", pagePath: "pages/Index", pageFullPath: "entry/src/main/ets/pages/Index", integratedHsp: "false", moduleType: "followWithHap" });
