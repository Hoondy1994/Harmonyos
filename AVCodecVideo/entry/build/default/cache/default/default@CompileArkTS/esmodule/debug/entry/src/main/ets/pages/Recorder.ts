if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface Recorder_Params {
    isRecorderTimeTextHide?: boolean;
    playFlag?: boolean;
    buttonEnabled?: boolean;
    videoRecorderTimeText?: string;
    fov?: number;
    XComponentSurfaceId?: string;
    cameraWidth?: number;
    cameraHeight?: number;
    XComponentController?: XComponentController;
    display?;
    heightPx?;
    widthPx?;
    timer?: number;
    seconds?: number;
    isReleased?: boolean;
    isBack?: boolean;
    range?: number[];
}
import camera from "@ohos:multimedia.camera";
import fileIo from "@ohos:file.fs";
import display from "@ohos:display";
import type { BusinessError as BusinessError } from "@ohos:base";
import colorSpaceManager from "@ohos:graphics.colorSpaceManager";
import recorder from "@app:com.samples.AVCodecSample/entry/recorder";
import Logger from "@bundle:com.samples.AVCodecSample/entry/ets/common/utils/Logger";
import { dateTime } from "@bundle:com.samples.AVCodecSample/entry/ets/common/utils/DateTimeUtils";
import { CommonConstants as Const } from "@bundle:com.samples.AVCodecSample/entry/ets/common/CommonConstants";
import type { CameraDataModel } from '../model/CameraDateModel';
import { previewProfileCameraCheck, videoProfileCheck } from "@bundle:com.samples.AVCodecSample/entry/ets/common/utils/CameraCheck";
const TAG: string = Const.RECORDER_TAG;
const context = AppStorage.get('context') as UIContext;
const params: CameraDataModel = context.getRouter().getParams() as CameraDataModel;
let cameraInput: camera.CameraInput;
let XComponentPreviewOutput: camera.PreviewOutput;
let encoderVideoOutput: camera.VideoOutput;
let videoSession: camera.VideoSession;
async function releaseCamera(): Promise<void> {
    // Stop the video output stream
    if (encoderVideoOutput) {
        encoderVideoOutput.stop((err: BusinessError) => {
            if (err) {
                Logger.error(TAG, `Failed to stop the encoder video output. error: ${JSON.stringify(err)}`);
                return;
            }
            Logger.info(TAG, 'Callback invoked to indicate the encoder video output stop success.');
        });
    }
    // Stop the Session.
    videoSession.stop();
    // Close file fd.
    fileIo.close(params.outputfd);
    // Close camera input stream.
    cameraInput.close();
    // Release preview output stream.
    XComponentPreviewOutput.release();
    // Release the video output stream.
    encoderVideoOutput.release();
    Logger.info(TAG, 'encoderVideoOutput release');
    // Release session.
    videoSession.release();
}
// [Start set_video_color]
function isVideoStabilizationModeSupported(session: camera.VideoSession, mode: camera.VideoStabilizationMode): boolean {
    let isSupported: boolean = false;
    try {
        isSupported = session.isVideoStabilizationModeSupported(mode);
    }
    catch (error) {
        // Failed to return error code error. code and handle it.
        let err = error as BusinessError;
        Logger.error(TAG, `The isVideoStabilizationModeSupported call failed. error code: ${err.code}`);
    }
    return isSupported;
}
function setVideoStabilizationMode(session: camera.VideoSession): boolean {
    let mode: camera.VideoStabilizationMode = camera.VideoStabilizationMode.AUTO;
    // Check if video stabilization is supported.
    let isSupported: boolean = isVideoStabilizationModeSupported(session, mode);
    if (isSupported) {
        Logger.info(TAG, `setVideoStabilizationMode: ${mode}`);
        // Setting video anti-shake
        session.setVideoStabilizationMode(mode);
        let activeVideoStabilizationMode = session.getActiveVideoStabilizationMode();
        Logger.info(TAG, `activeVideoStabilizationMode: ${activeVideoStabilizationMode}`);
    }
    else {
        Logger.info(TAG, `videoStabilizationMode: ${mode} is not support`);
    }
    return isSupported;
}
function getSupportedColorSpaces(session: camera.VideoSession): Array<colorSpaceManager.ColorSpace> {
    let colorSpaces: Array<colorSpaceManager.ColorSpace> = [];
    try {
        colorSpaces = session.getSupportedColorSpaces();
    }
    catch (error) {
        let err = error as BusinessError;
        Logger.error(TAG, `The getSupportedColorSpaces call failed. error code: ${err.code}`);
    }
    return colorSpaces;
}
// Set the color space
function setColorSpaceBeforeCommitConfig(session: camera.VideoSession, isHdr: number): void {
    let colorSpace: colorSpaceManager.ColorSpace = isHdr ? colorSpaceManager.ColorSpace.BT2020_HLG_LIMIT : colorSpaceManager.ColorSpace.BT709_LIMIT;
    let colorSpaces: Array<colorSpaceManager.ColorSpace> = getSupportedColorSpaces(session);
    let isSupportedColorSpaces = colorSpaces.indexOf(colorSpace) >= 0;
    if (isSupportedColorSpaces) {
        Logger.info(TAG, `setColorSpace: ${colorSpace}`);
        session.setColorSpace(colorSpace);
        let activeColorSpace: colorSpaceManager.ColorSpace = session.getActiveColorSpace();
        Logger.info(TAG, `activeColorSpace: ${activeColorSpace}`);
    }
    else {
        Logger.info(TAG, `colorSpace: ${colorSpace} is not support`);
    }
}
class Recorder extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__isRecorderTimeTextHide = new ObservedPropertySimplePU(true, this, "isRecorderTimeTextHide");
        this.__playFlag = new ObservedPropertySimplePU(false, this, "playFlag");
        this.__buttonEnabled = new ObservedPropertySimplePU(true, this, "buttonEnabled");
        this.__videoRecorderTimeText = new ObservedPropertySimplePU(Const.DEFAULT_TIME, this, "videoRecorderTimeText");
        this.__fov = new ObservedPropertySimplePU(1, this, "fov");
        this.XComponentSurfaceId = Const.DEFAULT_ID;
        this.cameraWidth = Const.DEFAULT_WIDTH;
        this.cameraHeight = Const.DEFAULT_HEIGHT;
        this.XComponentController = new XComponentController();
        this.display = display.getDefaultDisplaySync();
        this.heightPx = (this.display.width * this.cameraWidth / this.cameraHeight) + Const.PX;
        this.widthPx = this.display.width + Const.PX;
        this.timer = Const.DEFAULT_VALUE;
        this.seconds = Const.DEFAULT_VALUE;
        this.isReleased = false;
        this.isBack = false;
        this.range = [];
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: Recorder_Params) {
        if (params.isRecorderTimeTextHide !== undefined) {
            this.isRecorderTimeTextHide = params.isRecorderTimeTextHide;
        }
        if (params.playFlag !== undefined) {
            this.playFlag = params.playFlag;
        }
        if (params.buttonEnabled !== undefined) {
            this.buttonEnabled = params.buttonEnabled;
        }
        if (params.videoRecorderTimeText !== undefined) {
            this.videoRecorderTimeText = params.videoRecorderTimeText;
        }
        if (params.fov !== undefined) {
            this.fov = params.fov;
        }
        if (params.XComponentSurfaceId !== undefined) {
            this.XComponentSurfaceId = params.XComponentSurfaceId;
        }
        if (params.cameraWidth !== undefined) {
            this.cameraWidth = params.cameraWidth;
        }
        if (params.cameraHeight !== undefined) {
            this.cameraHeight = params.cameraHeight;
        }
        if (params.XComponentController !== undefined) {
            this.XComponentController = params.XComponentController;
        }
        if (params.display !== undefined) {
            this.display = params.display;
        }
        if (params.heightPx !== undefined) {
            this.heightPx = params.heightPx;
        }
        if (params.widthPx !== undefined) {
            this.widthPx = params.widthPx;
        }
        if (params.timer !== undefined) {
            this.timer = params.timer;
        }
        if (params.seconds !== undefined) {
            this.seconds = params.seconds;
        }
        if (params.isReleased !== undefined) {
            this.isReleased = params.isReleased;
        }
        if (params.isBack !== undefined) {
            this.isBack = params.isBack;
        }
        if (params.range !== undefined) {
            this.range = params.range;
        }
    }
    updateStateVars(params: Recorder_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__isRecorderTimeTextHide.purgeDependencyOnElmtId(rmElmtId);
        this.__playFlag.purgeDependencyOnElmtId(rmElmtId);
        this.__buttonEnabled.purgeDependencyOnElmtId(rmElmtId);
        this.__videoRecorderTimeText.purgeDependencyOnElmtId(rmElmtId);
        this.__fov.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__isRecorderTimeTextHide.aboutToBeDeleted();
        this.__playFlag.aboutToBeDeleted();
        this.__buttonEnabled.aboutToBeDeleted();
        this.__videoRecorderTimeText.aboutToBeDeleted();
        this.__fov.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __isRecorderTimeTextHide: ObservedPropertySimplePU<boolean>;
    get isRecorderTimeTextHide() {
        return this.__isRecorderTimeTextHide.get();
    }
    set isRecorderTimeTextHide(newValue: boolean) {
        this.__isRecorderTimeTextHide.set(newValue);
    }
    private __playFlag: ObservedPropertySimplePU<boolean>;
    get playFlag() {
        return this.__playFlag.get();
    }
    set playFlag(newValue: boolean) {
        this.__playFlag.set(newValue);
    }
    private __buttonEnabled: ObservedPropertySimplePU<boolean>;
    get buttonEnabled() {
        return this.__buttonEnabled.get();
    }
    set buttonEnabled(newValue: boolean) {
        this.__buttonEnabled.set(newValue);
    }
    private __videoRecorderTimeText: ObservedPropertySimplePU<string>;
    get videoRecorderTimeText() {
        return this.__videoRecorderTimeText.get();
    }
    set videoRecorderTimeText(newValue: string) {
        this.__videoRecorderTimeText.set(newValue);
    }
    private __fov: ObservedPropertySimplePU<number>;
    get fov() {
        return this.__fov.get();
    }
    set fov(newValue: number) {
        this.__fov.set(newValue);
    }
    private XComponentSurfaceId: string;
    private cameraWidth: number;
    private cameraHeight: number;
    private XComponentController: XComponentController;
    private display;
    private heightPx;
    private widthPx;
    private timer: number;
    private seconds: number;
    private isReleased: boolean;
    private isBack: boolean;
    private range: number[];
    onBackPress() {
        this.isBack = true;
    }
    onPageHide() {
        this.release();
        if (!this.isBack) {
            this.getUIContext().getRouter().back();
        }
    }
    async release(): Promise<void> {
        if (!this.isReleased) {
            this.isReleased = true;
            clearInterval(this.timer);
            this.seconds = 0;
            this.videoRecorderTimeText = Const.DEFAULT_TIME;
            recorder.stopNative().then(async (data) => {
                if (data.code === 0) {
                    await releaseCamera();
                    this.playFlag = false;
                }
            });
        }
    }
    getRecordTime(): void {
        this.timer = setInterval(() => {
            this.seconds += 1;
            this.videoRecorderTimeText = dateTime(this.seconds);
        }, 1000);
    }
    async createRecorder(): Promise<void> {
        releaseCamera();
        // Create the CameraManager object.
        let cameraManager = camera.getCameraManager(this.getUIContext().getHostContext());
        if (!cameraManager) {
            Logger.error(TAG, 'camera.getCameraManager error');
            return;
        }
        // Get supported camera devices.
        let cameraDevices: Array<camera.CameraDevice> = cameraManager.getSupportedCameras();
        if (cameraDevices !== undefined && cameraDevices.length <= 0) {
            Logger.error(TAG, 'cameraManager.getSupportedCameras error!');
            return;
        }
        // Get supported modes.
        let sceneModes: Array<camera.SceneMode> = cameraManager.getSupportedSceneModes(cameraDevices[0]);
        let isSupportVideoMode: boolean = sceneModes.indexOf(camera.SceneMode.NORMAL_VIDEO) >= 0;
        if (!isSupportVideoMode) {
            Logger.error('video mode not support');
            return;
        }
        // [Start create_video_output3]
        let videoProfile: undefined | camera.VideoProfile = videoProfileCheck(cameraManager, params);
        if (!videoProfile) {
            Logger.error(TAG, 'videoProfile is not found!');
            return;
        }
        // [StartExclude create_video_output3]
        //The preview stream of XComponent.
        // [Start camera_conversation]
        let XComponentPreviewProfile: camera.Profile | undefined = previewProfileCameraCheck(cameraManager, params);
        if (XComponentPreviewProfile === undefined) {
            Logger.error(TAG, 'XComponentPreviewProfile is not found');
            return;
        }
        // [StartExclude camera_conversation]
        // [EndExclude create_video_output3]
        // Create the encoder output object
        encoderVideoOutput = cameraManager.createVideoOutput(videoProfile, params.surfaceId);
        if (encoderVideoOutput === undefined) {
            Logger.error(TAG, 'encoderVideoOutput is undefined');
            return;
        }
        Logger.info(TAG, 'encoderVideoOutput  success');
        // [End create_video_output3]
        // Create a preview stream output object
        XComponentPreviewOutput = cameraManager.createPreviewOutput(XComponentPreviewProfile, this.XComponentSurfaceId);
        if (XComponentPreviewOutput === undefined) {
            Logger.error(TAG, 'XComponentPreviewOutput is undefined');
            return;
        }
        // Create the cameraInput object.
        try {
            cameraInput = cameraManager.createCameraInput(cameraDevices[0]);
        }
        catch (error) {
            let err = error as BusinessError;
            Logger.error(TAG, `Failed to createCameraInput. error: ${JSON.stringify(err)}`);
        }
        if (cameraInput === undefined) {
            Logger.error(TAG, 'cameraInput is undefined');
            return;
        }
        // Turn on the camera.
        try {
            await cameraInput.open();
        }
        catch (error) {
            let err = error as BusinessError;
            Logger.error(TAG, `Failed to open cameraInput. error: ${JSON.stringify(err)}`);
        }
        // [EndExclude camera_conversation]
        // Create a session flow
        try {
            videoSession = cameraManager.createSession(camera.SceneMode.NORMAL_VIDEO) as camera.VideoSession;
        }
        catch (error) {
            let err = error as BusinessError;
            Logger.error(TAG, `Failed to create the session instance. error: ${JSON.stringify(err)}`);
        }
        // [StartExclude camera_conversation]
        if (videoSession === undefined) {
            Logger.error(TAG, 'videoSession is undefined');
            return;
        }
        // [EndExclude camera_conversation]
        // Start Configuring the session.
        try {
            videoSession.beginConfig();
        }
        catch (error) {
            // [StartExclude camera_conversation]
            let err = error as BusinessError;
            Logger.error(TAG, `Failed to beginConfig. error: ${JSON.stringify(err)}`);
            // [EndExclude camera_conversation]
        }
        // [StartExclude camera_conversation]
        // Add CameraInput to the session.
        try {
            videoSession.addInput(cameraInput);
        }
        catch (error) {
            // DocsDot
            let err = error as BusinessError;
            Logger.error(TAG, `Failed to add cameraInput. error: ${JSON.stringify(err)}`);
            // DocsDot
        }
        // [EndExclude camera_conversation]
        // Add the XComponent preview stream to the session.
        try {
            videoSession.addOutput(XComponentPreviewOutput);
        }
        catch (error) {
            // [StartExclude camera_conversation]
            let err = error as BusinessError;
            Logger.error(TAG, `Failed to add XcomponentPreviewOutput. error: ${JSON.stringify(err)}`);
            // [EndExclude camera_conversation]
        }
        // Add the encoder video stream to the session.
        try {
            videoSession.addOutput(encoderVideoOutput);
        }
        catch (error) {
            // [StartExclude camera_conversation]
            let err = error as BusinessError;
            Logger.error(TAG, `Failed to add encoderVideoOutput. error: ${JSON.stringify(err)}`);
            // [EndExclude camera_conversation]
        }
        // Submit configuration information.
        try {
            await videoSession.commitConfig();
        }
        catch (error) {
            // [StartExclude camera_conversation]
            let err = error as BusinessError;
            Logger.error(TAG, `videoSession commitConfig error: ${JSON.stringify(err)}`);
            // [EndExclude camera_conversation]
        }
        // Set video stabilization.
        if (setVideoStabilizationMode(videoSession)) {
            // Set color space.
            setColorSpaceBeforeCommitConfig(videoSession, params.isHDRVivid);
        }
        // Session start.
        try {
            await videoSession.start();
        }
        catch (error) {
            // [StartExclude camera_conversation]
            let err = error as BusinessError;
            Logger.error(TAG, `videoSession start error: ${JSON.stringify(err)}`);
            // [EndExclude camera_conversation]
        }
        // Start the video output stream
        encoderVideoOutput.start((err: BusinessError) => {
            // [StartExclude camera_conversation]
            if (err) {
                Logger.error(TAG, `Failed to start the encoder video output. error: ${JSON.stringify(err)}`);
                return;
            }
            Logger.info(TAG, 'Callback invoked to indicate the encoder video output start success.');
            // [EndExclude camera_conversation]
        });
        // [End camera_conversation]
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Stack.create();
            Stack.width(Const.FULL_SIZE);
            Stack.height(Const.FULL_SIZE);
            Stack.backgroundColor(Color.Black);
            Stack.expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.TOP, SafeAreaEdge.BOTTOM]);
        }, Stack);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            XComponent.create({
                id: 'recorderXComponent',
                type: XComponentType.SURFACE,
                controller: this.XComponentController
            }, "com.samples.AVCodecSample/entry");
            XComponent.onLoad(() => {
                this.XComponentSurfaceId = this.XComponentController.getXComponentSurfaceId();
                this.createRecorder();
                this.playFlag = true;
                recorder.startNative();
                this.isRecorderTimeTextHide = false;
                this.getRecordTime();
            });
            XComponent.width(this.widthPx);
            XComponent.height(this.heightPx);
            Gesture.create(GesturePriority.Low);
            PinchGesture.create();
            PinchGesture.onActionUpdate((event: GestureEvent) => {
                if (videoSession) {
                    let currentFov = this.fov * event.scale;
                    if (currentFov > this.range[1]) {
                        currentFov = this.range[1];
                    }
                    if (currentFov < this.range[0]) {
                        currentFov = this.range[0];
                    }
                    videoSession.setZoomRatio(currentFov);
                }
            });
            PinchGesture.onActionEnd((event: GestureEvent) => {
                if (videoSession) {
                    this.fov = videoSession.getZoomRatio();
                }
            });
            PinchGesture.pop();
            Gesture.pop();
        }, XComponent);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (!this.isRecorderTimeTextHide) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(this.videoRecorderTimeText);
                        Text.fontFamily('HarmonyHeilTi-Light');
                        Text.fontSize(27);
                        Text.fontColor(Color.White);
                        Text.align(Alignment.Bottom);
                        Text.margin({ bottom: { "id": 16777243, "type": 10002, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" } });
                    }, Text);
                    Text.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777252, "type": 20000, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" });
            Image.width({ "id": 16777242, "type": 10002, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" });
            Image.height({ "id": 16777240, "type": 10002, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" });
            Image.margin({ top: { "id": 16777241, "type": 10002, params: [], "bundleName": "com.samples.AVCodecSample", "moduleName": "entry" } });
            Image.onClick(() => {
                this.buttonEnabled = false;
                this.release();
                this.isBack = true;
                this.getUIContext().getRouter().back();
            });
            Image.enabled(this.buttonEnabled);
        }, Image);
        Stack.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "Recorder";
    }
}
registerNamedRoute(() => new Recorder(undefined, {}), "", { bundleName: "com.samples.AVCodecSample", moduleName: "entry", pagePath: "pages/Recorder", pageFullPath: "entry/src/main/ets/pages/Recorder", integratedHsp: "false", moduleType: "followWithHap" });
