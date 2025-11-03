import camera from "@ohos:multimedia.camera";
import Logger from "@bundle:com.samples.AVCodecSample/entry/ets/common/utils/Logger";
import type { CameraDataModel } from '../../model/CameraDateModel';
import { CommonConstants as Const } from "@bundle:com.samples.AVCodecSample/entry/ets/common/CommonConstants";
const TAG = 'CAMERA_CHECK';
function getPreviewProfile(previewProfiles: Array<camera.Profile>, size: camera.Size, isHDRVivid: number): undefined | camera.Profile {
    let previewProfile: undefined | camera.Profile = previewProfiles.find((profile: camera.Profile) => {
        if (isHDRVivid) {
            return profile.format === camera.CameraFormat.CAMERA_FORMAT_YCRCB_P010 &&
                profile.size.width === size.width && profile.size.height == size.height;
        }
        else {
            return profile.format === camera.CameraFormat.CAMERA_FORMAT_YUV_420_SP &&
                profile.size.width === size.width && profile.size.height == size.height;
        }
    });
    Logger.info(TAG, `profile.format: ${previewProfile!.size.width}`);
    return previewProfile;
}
export function previewProfileCameraCheck(cameraManager: camera.CameraManager, cameraData: CameraDataModel): undefined | camera.Profile {
    let cameraDevices = cameraManager.getSupportedCameras();
    if (cameraDevices !== undefined && cameraDevices.length <= 0) {
        Logger.error(TAG, 'cameraManager.getSupportedCameras error!');
        return;
    }
    let profiles: camera.CameraOutputCapability = cameraManager.getSupportedOutputCapability(cameraDevices[0], camera.SceneMode.NORMAL_VIDEO);
    if (!profiles) {
        Logger.error(TAG, 'cameraManager.getSupportedOutputCapability error!');
        return;
    }
    let previewProfilesArray: Array<camera.Profile> = profiles.previewProfiles;
    if (!previewProfilesArray) {
        Logger.error(TAG, "createOutput previewProfilesArray == null || undefined");
        return;
    }
    let videoSize: camera.Size = {
        width: 1920,
        height: 1080
    };
    let previewProfile: undefined | camera.Profile = getPreviewProfile(previewProfilesArray, videoSize, cameraData.isHDRVivid);
    if (!previewProfile) {
        Logger.error(TAG, 'previewProfile is not found');
        return;
    }
    return previewProfile;
}
// [Start create_video_output2]
export function videoProfileCheck(cameraManager: camera.CameraManager, cameraData: CameraDataModel): undefined | camera.VideoProfile {
    let cameraDevices = cameraManager.getSupportedCameras();
    // [StartExclude create_video_output2]
    if (cameraDevices !== undefined && cameraDevices.length <= 0) {
        Logger.error(TAG, 'cameraManager.getSupportedCameras error!');
        return;
    }
    // [EndExclude create_video_output2]
    let profiles: camera.CameraOutputCapability = cameraManager.getSupportedOutputCapability(cameraDevices[0], camera.SceneMode.NORMAL_VIDEO);
    // [StartExclude create_video_output2]
    if (!profiles) {
        Logger.error(TAG, 'cameraManager.getSupportedOutputCapability error!');
        return;
    }
    // [EndExclude create_video_output2]
    let videoProfiles: Array<camera.VideoProfile> = profiles.videoProfiles;
    // [StartExclude create_video_output2]
    if (!videoProfiles) {
        Logger.error(TAG, 'Get videoProfiles error!');
        return;
    }
    // [EndExclude create_video_output2]
    let videoProfile: undefined | camera.VideoProfile = videoProfiles.find((profile: camera.VideoProfile) => {
        if (cameraData.isHDRVivid) {
            // [StartExclude create_video_output2]
            if (cameraData.frameRate === Const.FRAMERATE_VIDEO_30FPS) {
                // [EndExclude create_video_output2]
                return profile.size.width === cameraData.cameraWidth &&
                    profile.size.height === cameraData.cameraHeight &&
                    profile.format === camera.CameraFormat.CAMERA_FORMAT_YCBCR_P010 &&
                    profile.frameRateRange.min === 1 &&
                    profile.frameRateRange.max === 30;
                // [StartExclude create_video_output2]
            }
            else {
                return profile.size.width === cameraData.cameraWidth &&
                    profile.size.height === cameraData.cameraHeight &&
                    profile.format === camera.CameraFormat.CAMERA_FORMAT_YCBCR_P010 &&
                    profile.frameRateRange.min === cameraData.frameRate &&
                    profile.frameRateRange.max === cameraData.frameRate;
            }
            // [EndExclude create_video_output2]
        }
        else {
            // [StartExclude create_video_output2]
            if (cameraData.frameRate === Const.FRAMERATE_VIDEO_30FPS) {
                return profile.size.width === cameraData.cameraWidth &&
                    profile.size.height === cameraData.cameraHeight &&
                    profile.format === camera.CameraFormat.CAMERA_FORMAT_YUV_420_SP &&
                    profile.frameRateRange.min === 1 &&
                    profile.frameRateRange.max === 30;
            }
            else {
                return profile.size.width === cameraData.cameraWidth &&
                    profile.size.height === cameraData.cameraHeight &&
                    profile.format === camera.CameraFormat.CAMERA_FORMAT_YUV_420_SP &&
                    profile.frameRateRange.min === cameraData.frameRate &&
                    profile.frameRateRange.max === cameraData.frameRate;
            }
            // [EndExclude create_video_output2]
        }
    });
    return videoProfile;
}
