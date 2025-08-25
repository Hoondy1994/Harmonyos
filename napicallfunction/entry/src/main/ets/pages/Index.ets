import hilog from '@ohos.hilog';
import testNapi from 'libentry.so';


export class Add{
  add(a:number, b:number):number{
    const c = a+b;
    console.log("test add" + c)
    return c;
  }
}
@Entry
@Component
struct Index {
  build() {
    Row() {
      Column() {
        Button("C++ Call JS")
          .fontSize(50)
          .fontWeight(FontWeight.Bold)
          .onClick(() => {
            hilog.info(0x0000, 'testTag', 'C++ Call JS 2 + 3 = %{public}d', testNapi.NativeCallArkTS(new Add(), 2, 3));
          })
      }
      .width('100%')
    }
    .height('100%')
  }
}