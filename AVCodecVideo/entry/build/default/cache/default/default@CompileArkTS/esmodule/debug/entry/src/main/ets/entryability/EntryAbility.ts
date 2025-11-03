import abilityAccessCtrl from "@ohos:abilityAccessCtrl";
import type AbilityConstant from "@ohos:app.ability.AbilityConstant";
import UIAbility from "@ohos:app.ability.UIAbility";
import type Want from "@ohos:app.ability.Want";
import type { BusinessError as BusinessError } from "@ohos:base";
import hilog from "@ohos:hilog";
import type window from "@ohos:window";
import Logger from "@bundle:com.samples.AVCodecSample/entry/ets/common/utils/Logger";
export default class EntryAbility extends UIAbility {
    onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
        hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onCreate');
    }
    onDestroy(): void {
        hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onDestroy');
    }
    onWindowStageCreate(windowStage: window.WindowStage): void {
        // Main window is created, set main page for this ability
        hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onWindowStageCreate');
        try {
            let atManager = abilityAccessCtrl.createAtManager();
            atManager.requestPermissionsFromUser(this.context, ['ohos.permission.CAMERA', 'ohos.permission.MICROPHONE'])
                .then((data) => {
                Logger.info('Entry', 'requestPre() data: ' + JSON.stringify(data));
            }).catch((err: BusinessError) => {
                Logger.info('Entry', 'requestPre() data: ' + JSON.stringify(err));
            });
        }
        catch (err) {
            Logger.error('Entry', 'requestPre() data: ' + JSON.stringify(err));
        }
        windowStage.getMainWindowSync().setWindowKeepScreenOn(true);
        windowStage.loadContent('pages/Index', (err) => {
            if (err.code) {
                hilog.error(0x0000, 'testTag', 'Failed to load the content. Cause: %{public}s', JSON.stringify(err) ?? '');
                return;
            }
            AppStorage.setOrCreate("context", windowStage.getMainWindowSync().getUIContext());
            hilog.info(0x0000, 'testTag', 'Succeeded in loading the content.');
        });
    }
    onWindowStageDestroy(): void {
        // Main window is destroyed, release UI related resources
        hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onWindowStageDestroy');
    }
    onForeground(): void {
        // Ability has brought to foreground
        hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onForeground');
    }
    onBackground(): void {
        // Ability has back to background
        hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onBackground');
    }
}
;
