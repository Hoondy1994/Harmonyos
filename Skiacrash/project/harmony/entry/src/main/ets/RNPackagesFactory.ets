import type {RNPackageContext, RNPackage} from '@rnoh/react-native-openharmony/ts';
/**
 * Importing ets files from top level barrel file doesn't work.
 */
import {ReanimatedPackage} from '@react-native-oh-tpl/react-native-reanimated/ts';
import {RNSkiaPackage} from '@react-native-oh-tpl/react-native-skia/ts';
import {SafeAreaViewPackage} from '@react-native-oh-tpl/react-native-safe-area-context/ts';
import {GestureHandlerPackage} from '@react-native-oh-tpl/react-native-gesture-handler/ts';

export function createRNPackages(ctx: RNPackageContext): RNPackage[] {
  return [new RNSkiaPackage(ctx), new ReanimatedPackage(ctx), new SafeAreaViewPackage(ctx), new GestureHandlerPackage(ctx)];
}
