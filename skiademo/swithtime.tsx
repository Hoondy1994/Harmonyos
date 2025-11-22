// App.js — minimal, staged repro
import React, { useEffect, useRef, useState } from "react";
import { View, Text } from "react-native";
import { Canvas, Rect } from "@react-native-oh-tpl/react-native-skia";

export default function App() {
  const [mounted, setMounted] = useState(false); // 先挂载 Canvas
  const [show, setShow] = useState(true);        // 再开始切 display
  const flipRef = useRef(null);

  // 分两步：避免启动瞬间就切 display 导致直接崩溃
  useEffect(() => {
    const mountDelayMs = 600; // 调小/调大都行
    const startFlipDelayMs = 1000;
    const intervalMs = 200;   // 越小越容易复现（可改 200/150）

    const t1 = setTimeout(() => setMounted(true), mountDelayMs);
    const t2 = setTimeout(() => {
      flipRef.current = setInterval(() => setShow((s) => !s), intervalMs);
    }, startFlipDelayMs);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (flipRef.current) clearInterval(flipRef.current);
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#101010", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", marginBottom: 10 }}>
        mounted={String(mounted)} • display={show ? "flex" : "none"}
      </Text>

      {/* 关键：切父容器的 display。Canvas 自身保持不变 */}
      <View style={{ display: show ? "flex" : "none" }}>
        {mounted ? (
          <Canvas style={{ width: 240, height: 160 }}>
            <Rect x={20} y={20} width={200} height={120} color="#66ccff" />
          </Canvas>
        ) : (
          // 占位，确保首帧可见，避免“黑屏误判”
          <View style={{ width: 240, height: 160, backgroundColor: "#333" }} />
        )}
      </View>
    </View>
  );
}