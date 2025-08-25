#include "napi/native_api.h"
#include <hilog/log.h>

// C++调用JS 
static napi_value NativeCallArkTS(napi_env env, napi_callback_info info) { 
    // 期望从ArkTS侧获取的参数的数量，napi_value可理解为ArkTS value在native方法中的表现形式。 
    size_t argc = 3; 
    napi_value args[3] = {nullptr}; 
    // 从info中，拿到从ArkTS侧传递过来的参数。 
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr); 
    // 获取对象的方法 
    napi_value add; 
    napi_get_named_property(env, args[0], "add", &add); 
    // 获取函数入参 
    double value0; 
    napi_get_value_double(env, args[1], &value0); 
    double value1; 
    napi_get_value_double(env, args[2], &value1); 
    // 创建两个个ArkTS number作为ArkTS function的入参。 
    napi_value argv[2] = {nullptr}; 
    napi_create_double(env, value0, &argv[0]); 
    napi_create_double(env, value1, &argv[1]); 
    napi_value result = nullptr; 
    // native方法中调用ArkTS function，其返回值保存到result中并返到ArkTS侧。 
    OH_LOG_Print(LOG_APP, LOG_ERROR, LOG_INFO, "Init", "NativeCallArkTS ENTER ");
    napi_call_function(env, nullptr, add, 2, argv, &result); 

    return result; 
}


EXTERN_C_START
static napi_value Init(napi_env env, napi_value exports)
{
    napi_property_descriptor desc[] = {
         { "NativeCallArkTS", nullptr, NativeCallArkTS, nullptr, nullptr, nullptr, napi_default, nullptr } 
    };
    napi_define_properties(env, exports, sizeof(desc) / sizeof(desc[0]), desc);
    return exports;
}
EXTERN_C_END

static napi_module demoModule = {
    .nm_version = 1,
    .nm_flags = 0,
    .nm_filename = nullptr,
    .nm_register_func = Init,
    .nm_modname = "entry",
    .nm_priv = ((void*)0),
    .reserved = { 0 },
};

extern "C" __attribute__((constructor)) void RegisterEntryModule(void)
{
    napi_module_register(&demoModule);
}
