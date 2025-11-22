// App.tsx — 故意复现伙伴的坑：只建一张图，每次画完都 dispose，同一张图再用就容易崩
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, View, Image as RNImage, Pressable, Text, StyleSheet } from "react-native";
import { Skia, ImageFormat } from "@shopify/react-native-skia";

const W = 360;
const H = 360;

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  col: { alignItems: "center", padding: 16, gap: 16 },
  box: { width: W, height: W, backgroundColor: "#eee" },
  btn: {
    backgroundColor: "#9c6b00",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnText: { color: "#fff" },
});

// 你给的 15×15 PNG
const B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAAPElEQVQokWNgGAWjgP8ZGBgY/xkYqAwMjDg0mJgYGBhOIoZJkBzGQFJg0hC0gQkqg0gQ0kAxmQAA8o8I0An8y7AAAAAElFTkSuQmCC";

function b64ToBytes(b64: string): Uint8Array {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let i = 0;
  const out: number[] = [];
  b64 = b64.replace(/[\r\n=]/g, "");
  while (i < b64.length) {
    const c1 = chars.indexOf(b64[i++] || "A");
    const c2 = chars.indexOf(b64[i++] || "A");
    const c3 = chars.indexOf(b64[i++] || "A");
    const c4 = chars.indexOf(b64[i++] || "A");
    const n = (c1 << 18) | (c2 << 12) | ((c3 & 63) << 6) | (c4 & 63);
    out.push((n >> 16) & 255);
    if (c3 !== 64 && c3 !== -1) out.push((n >> 8) & 255);
    if (c4 !== 64 && c4 !== -1) out.push(n & 255);
  }
  return new Uint8Array(out);
}
function makeImgOnce() {
  const d = Skia.Data.fromBytes(b64ToBytes(B64));
  const img = Skia.Image.MakeImageFromEncoded(d);
  d.dispose?.();
  return img;
}

export default function App() {
  // 上半区：你要看的原图
  const topUri = `data:image/png;base64,${B64}`;

  // 下半区用的那张图：只创建一次！！！
  const imgRef = useRef<any>(null);

  // 为了在屏幕上能看到这次画出来的东西
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    // 只建一次
    imgRef.current = makeImgOnce();
  }, []);

  const onPintu = () => {
    const img = imgRef.current;
    // 第一次一定进来；第二次开始，这个 img 虽然 JS 上还在，但可能 native 已经被我们自己 dispose 掉了
    if (!img) return;

    const surface = Skia.Surface.MakeOffscreen(W, H);
    const canvas = surface.getCanvas();
    canvas.clear(Skia.Color("#F3F3F8"));

    // ====== 一模一样的伙伴逻辑 ======
    const iw = img.width(); // ← 第二次要是崩，就会崩这里
    const ih = img.height();

    const imageFrame = { x: 40, y: 60, width: 200, height: 120 };
    const deg = 35;
    const rad = (deg * Math.PI) / 180;

    canvas.save();
    canvas.translate(
      imageFrame.x + imageFrame.width / 2,
      imageFrame.y + imageFrame.height / 2
    );

    // 伙伴就是这样 rotate 的（传度+4参）
    (canvas as any).rotate(deg, 0, 0, 0);

    // 伙伴这段包络
    const dstW =
      imageFrame.height * Math.abs(Math.sin(rad)) +
      imageFrame.width * Math.abs(Math.cos(rad));
    const dstH =
      imageFrame.width * Math.abs(Math.sin(rad)) +
      imageFrame.height * Math.abs(Math.cos(rad));

    const src = Skia.XYWHRect(0, 0, iw, ih);
    const dst = Skia.XYWHRect(-dstW / 2, -dstH / 2, dstW, dstH);
    const paint = Skia.Paint();

    (canvas as any).drawImageRect(img, src, dst, paint, true);

    // ★★ 伙伴的坑点：画完就 dispose 同一张

    // img.dispose?.();
    canvas.restore();
    // ====== 伙伴逻辑结束 ======

    const snap = surface.makeImageSnapshot();
    const b64 = snap.encodeToBase64(ImageFormat.PNG, 100);
    const uri = `data:image/png;base64,${b64}`;

    // 把这次结果丢到屏幕上，看是正常还是空白
    setSaved(prev => [uri, ...prev]);

  };

  return (
    <ScrollView style={S.root} contentContainerStyle={S.col}>
      {/* 上半区：原图 */}
      <View style={S.box}>
        <RNImage source={{ uri: topUri }} style={{ width: W, height: W }} resizeMode="contain" />
      </View>

      <Pressable style={S.btn} onPress={onPintu}>
        <Text style={S.btnText}>拼图（伙伴原样逻辑，只建一次图）</Text>
      </Pressable>

      {/* 下半区：看结果。第二次如果你的鸿蒙会炸/空白，就能看到 */}
      {saved.length === 0 ? (
        <View style={S.box}>
          <Text style={{ padding: 10 }}>点“拼图”复现</Text>
        </View>
      ) : (
        saved.map((uri, idx) => (
          <View key={idx} style={S.box}>
            <RNImage source={{ uri }} style={{ width: W, height: W }} resizeMode="contain" />
            <Text style={{ textAlign: "center" }}>
              第 {saved.length - idx} 次
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}