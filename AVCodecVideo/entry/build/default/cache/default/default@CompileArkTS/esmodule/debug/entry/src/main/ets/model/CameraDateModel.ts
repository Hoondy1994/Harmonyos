import type camera from "@ohos:multimedia.camera";
import { CommonConstants as Const } from "@bundle:com.samples.AVCodecSample/entry/ets/common/CommonConstants";
export class CameraDataModel {
    public surfaceId: string = '';
    public cameraWidth: number = Const.DEFAULT_WIDTH;
    public cameraHeight: number = Const.DEFAULT_HEIGHT;
    public isHDRVivid: number = Const.DEFAULT_VALUE;
    public outputfd: number = -1;
    public frameRate: number = Const.FRAMERATE_VIDEO_30FPS;
    public previewProfile: camera.Profile = Const.DEFAULT_PROFILE;
    public videoCodecMime: string | null = Const.MIME_VIDEO_AVC;
    public bitRate: number = Const.BITRATE_VIDEO_20M;
    setCodecFormat(isHDR: number, codecMime: string): void {
        this.isHDRVivid = isHDR;
        this.videoCodecMime = codecMime;
    }
    setResolution(width: number, height: number, bit: number): void {
        this.cameraWidth = width;
        this.cameraHeight = height;
        this.bitRate = bit;
    }
}
