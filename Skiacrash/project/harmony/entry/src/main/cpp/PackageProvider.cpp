#include "RNOH/PackageProvider.h"
#include "ReanimatedPackage.h"
#include "SkiaPackage.h"
#include "SafeAreaViewPackage.h"
#include "generated/RNOHGeneratedPackage.h"
#include "GestureHandlerPackage.h"

using namespace rnoh;

std::vector<std::shared_ptr<Package>> PackageProvider::getPackages(
    Package::Context ctx) {
  return {
      std::make_shared<SkiaPackage>(ctx),
      std::make_shared<ReanimatedPackage>(ctx),
      std::make_shared<SafeAreaViewPackage>(ctx),
      std::make_shared<RNOHGeneratedPackage>(ctx),
      std::make_shared<GestureHandlerPackage>(ctx)
  };
}