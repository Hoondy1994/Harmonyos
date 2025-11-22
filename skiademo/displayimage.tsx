import React from "react";
import { Canvas, Image, useImage } from "@shopify/react-native-skia";
import { View } from "react-native";

const App = () => {
  const width = 256;
  const height = 256;
  console.log("[App] mounted");

  // 本地文件路径（鸿蒙设备上的 test.txt 改成图片，比如 test.png）
const image = useImage("asset://test1.png");

  return (
    <View>
      <Canvas style={{ width, height }}>
        {image && (
          <Image
            image={image}
            x={0}
            y={0}
            width={width}
            height={height}
            fit="cover"
          />
        )}
      </Canvas>
    </View>
  );
};

export default App;