if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface Index_Params {
    xComponentContext?: Record<string, () => void>;
}
import nativeRender from "@app:com.huawei.xcomponent/entry/nativerender";
import { ContextType } from "@bundle:com.huawei.xcomponent/entry/ets/entryability/EntryAbility";
import CommonConstants from "@bundle:com.huawei.xcomponent/entry/ets/common/CommonConstants";
const nativePageLifecycle: Record<string, () => void> = nativeRender.getContext(ContextType.PAGE_LIFECYCLE) as Record<string, () => void>;
class Index extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.xComponentContext = {};
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: Index_Params) {
        if (params.xComponentContext !== undefined) {
            this.xComponentContext = params.xComponentContext;
        }
    }
    updateStateVars(params: Index_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
    }
    aboutToBeDeleted() {
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private xComponentContext: Record<string, () => void>;
    aboutToAppear(): void {
        console.log('[LIFECYCLE-Index] aboutToAppear');
        nativePageLifecycle.aboutToAppear();
    }
    aboutToDisappear(): void {
        console.log('[LIFECYCLE-Index] aboutToDisappear');
        nativePageLifecycle.aboutToDisappear();
    }
    onPageShow(): void {
        console.log('[LIFECYCLE-Page] onPageShow');
        nativePageLifecycle.onPageShow();
    }
    onPageHide(): void {
        console.log('[LIFECYCLE-Page] onPageHide');
        nativePageLifecycle.onPageHide();
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width(CommonConstants.FULL_PARENT);
            Column.height(CommonConstants.FULL_PARENT);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.margin({ top: { "id": 16777229, "type": 10002, params: [], "bundleName": "com.huawei.xcomponent", "moduleName": "entry" } });
            Row.width(CommonConstants.FULL_PARENT);
            Row.height({ "id": 16777228, "type": 10002, params: [], "bundleName": "com.huawei.xcomponent", "moduleName": "entry" });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create({ "id": 16777222, "type": 10003, params: [], "bundleName": "com.huawei.xcomponent", "moduleName": "entry" });
            Text.fontSize({ "id": 16777230, "type": 10002, params: [], "bundleName": "com.huawei.xcomponent", "moduleName": "entry" });
            Text.fontWeight(CommonConstants.FONT_WEIGHT);
            Text.margin({
                left: { "id": 16777231, "type": 10002, params: [], "bundleName": "com.huawei.xcomponent", "moduleName": "entry" },
                top: { "id": 16777232, "type": 10002, params: [], "bundleName": "com.huawei.xcomponent", "moduleName": "entry" }
            });
        }, Text);
        Text.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.margin({
                top: { "id": 16777235, "type": 10002, params: [], "bundleName": "com.huawei.xcomponent", "moduleName": "entry" },
                left: { "id": 16777233, "type": 10002, params: [], "bundleName": "com.huawei.xcomponent", "moduleName": "entry" },
                right: { "id": 16777234, "type": 10002, params: [], "bundleName": "com.huawei.xcomponent", "moduleName": "entry" }
            });
            Column.height(CommonConstants.XCOMPONENT_HEIGHT);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            XComponent.create({
                id: CommonConstants.XCOMPONENT_ID,
                type: CommonConstants.XCOMPONENT_TYPE,
                libraryname: CommonConstants.XCOMPONENT_LIBRARY_NAME
            }, "com.huawei.xcomponent/entry");
            XComponent.onLoad((xComponentContext?: object | Record<string, () => void>) => {
                if (xComponentContext) {
                    this.xComponentContext = xComponentContext as Record<string, () => void>;
                }
            });
        }, XComponent);
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width(CommonConstants.FULL_PARENT);
            Row.justifyContent(FlexAlign.Center);
            Row.alignItems(VerticalAlign.Bottom);
            Row.layoutWeight(CommonConstants.LAYOUT_WEIGHT);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel({ "id": 16777220, "type": 10003, params: [], "bundleName": "com.huawei.xcomponent", "moduleName": "entry" });
            Button.fontSize({ "id": 16777225, "type": 10002, params: [], "bundleName": "com.huawei.xcomponent", "moduleName": "entry" });
            Button.fontWeight(CommonConstants.FONT_WEIGHT);
            Button.margin({ bottom: { "id": 16777227, "type": 10002, params: [], "bundleName": "com.huawei.xcomponent", "moduleName": "entry" } });
            Button.onClick(() => {
                if (this.xComponentContext) {
                    this.xComponentContext.drawRectangle();
                }
            });
            Button.width(CommonConstants.BUTTON_WIDTH);
            Button.height({ "id": 16777226, "type": 10002, params: [], "bundleName": "com.huawei.xcomponent", "moduleName": "entry" });
        }, Button);
        Button.pop();
        Row.pop();
        Column.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "Index";
    }
}
registerNamedRoute(() => new Index(undefined, {}), "", { bundleName: "com.huawei.xcomponent", moduleName: "entry", pagePath: "pages/Index" });
