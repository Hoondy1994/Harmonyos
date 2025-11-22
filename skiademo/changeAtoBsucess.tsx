// App.tsx —— 明显“跳转页面”的动画栈（无第三方导航库）
// PageA -> PageB（侧滑进入），返回时侧滑退出
import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutChangeEvent,
  Animated,
  Dimensions,
} from 'react-native';
import { Canvas, Image as SkImage, useImage } from '@shopify/react-native-skia';

const SCREEN_W = Dimensions.get('window').width;

// 用 asset:// 资源（把 test1.png / test2.png 放到原生 assets）
const IMG_A = 'asset://test1.png';
const IMG_B = 'asset://test2.png';

type Route = { name: 'PageA' } | { name: 'PageB' };

export default function App() {
  const [stack, setStack] = React.useState<Route[]>([{ name: 'PageA' }]);
  const [anim] = React.useState(new Animated.Value(0)); // 0: 当前页；1: 顶层在右侧待入场
  const current = stack[stack.length - 1];

  // push：先把新页压入，再做从右侧滑入动画
  const push = (r: Route) => {
    setStack((s) => [...s, r]);
    anim.stopAnimation();
    anim.setValue(1); // 新页起始在屏右
    Animated.timing(anim, { toValue: 0, duration: 240, useNativeDriver: true }).start();
  };

  // pop：先做当前页向右退出动画，结束后再弹栈；当只剩一页时复位 anim
  const pop = () => {
    anim.stopAnimation();
    Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true })
      .start(({ finished }) => {
        if (!finished) return;
        setStack((s) => {
          const next = s.length > 1 ? s.slice(0, s.length - 1) : s;
          if (next.length === 1) anim.setValue(0); // ★ 关键复位
          return next;
        });
      });
  };

  // 兜底：只剩 1 页时强制复位 anim，避免任何竞态把唯一页面留在屏外
  React.useEffect(() => {
    if (stack.length === 1) {
      anim.stopAnimation();
      anim.setValue(0);
    }
  }, [stack.length, anim]);

  // 顶层与底层的位移
  const translateTop = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCREEN_W],
  });
  const translateUnder = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -SCREEN_W * 0.08],
  });

  const under = stack.length > 1 ? stack[stack.length - 2] : null;

  return (
    <SafeAreaView style={S.root}>
      <Text style={S.appTitle}>Animated Navigation (No deps)</Text>

      {/* 底层上一页（可选） */}
      {under ? (
        <Animated.View style={[S.pageContainer, { transform: [{ translateX: translateUnder }] }]}>
          {under.name === 'PageA'
            ? <PageA onGoB={() => push({ name: 'PageB' })} />
            : <PageB onBack={() => pop()} onGoA={() => push({ name: 'PageA' })} />
          }
        </Animated.View>
      ) : null}

      {/* 顶层当前页 */}
      <Animated.View style={[S.pageContainer, { transform: [{ translateX: translateTop }] }]}>
        {current.name === 'PageA'
          ? <PageA onGoB={() => push({ name: 'PageB' })} />
          : <PageB onBack={() => pop()} onGoA={() => push({ name: 'PageA' })} />
        }
      </Animated.View>
    </SafeAreaView>
  );
}

/** ---------------- Pages ---------------- */

function PageA({ onGoB }: { onGoB: () => void }) {
  // 页面实例 id：用于强制 DeviceCanvas 在页面重挂载时完全重建（避免旧纹理）
  const pageRev = React.useRef(`${Date.now()}_${Math.random()}`).current;
  return (
    <View style={S.page}>
      <Header title="Page A (Device A)" />
      <DeviceCanvas key={`A_${pageRev}`} label="Device A" imageSource={IMG_A} />
      <View style={S.row}>
        <Btn text="Go to Page B" onPress={onGoB} />
      </View>
    </View>
  );
}

function PageB({ onBack, onGoA }: { onBack: () => void; onGoA: () => void }) {
  const pageRev = React.useRef(`${Date.now()}_${Math.random()}`).current;
  return (
    <View style={S.page}>
      <Header title="Page B (Device B)" />
      <DeviceCanvas key={`B_${pageRev}`} label="Device B" imageSource={IMG_B} />
      <View style={S.row}>
        <Btn text="Go back to Page A" onPress={onBack} />
        <Btn text="Go to Page A" onPress={onGoA} />
      </View>
    </View>
  );
}

function Header({ title }: { title: string }) {
  return <Text style={S.title}>{title}</Text>;
}

function Btn({ text, onPress }: { text: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={S.btn} onPress={onPress}>
      <Text style={S.btnText}>{text}</Text>
    </TouchableOpacity>
  );
}

/** -------------- Skia Canvas -------------- */

function DeviceCanvas({ label, imageSource }: { label: string; imageSource: string }) {
  const img = useImage(imageSource);
  const [size, setSize] = React.useState({ w: 0, h: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: Math.floor(width), h: Math.floor(height) });
  };

  React.useEffect(() => {
    console.log(`[${label}] mount -> Canvas`);
    return () => console.log(`[${label}] unmount -> Canvas destroyed`);
  }, [label]);

  const place = React.useMemo(() => {
    if (!img || size.w < 2 || size.h < 2) return null;
    const iw = img.width();
    const ih = img.height();
    if (iw === 0 || ih === 0) return null;
    const scale = Math.min(size.w / iw, size.h / ih);
    const w = Math.max(1, Math.floor(iw * scale));
    const h = Math.max(1, Math.floor(ih * scale));
    const x = Math.floor((size.w - w) / 2);
    const y = Math.floor((size.h - h) / 2);
    return { x, y, w, h };
  }, [img, size]);

  return (
    <View style={S.canvasBox} onLayout={onLayout}>
      <Canvas style={{ width: '100%', height: '100%' }}>
        {img && place ? <SkImage image={img} x={place.x} y={place.y} width={place.w} height={place.h} /> : null}
      </Canvas>
      <View style={S.overlay}>
        <Text style={S.overlayText}>
          {label} | {size.w}×{size.h}
        </Text>
      </View>
    </View>
  );
}

/** ---------------- Styles ---------------- */

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1115' },
  appTitle: { color: '#97a3b6', fontSize: 12, textAlign: 'center', marginTop: 6 },
  pageContainer: { ...StyleSheet.absoluteFillObject },
  page: { flex: 1, padding: 16 },
  title: { color: '#e6edf3', fontSize: 18, fontWeight: '600', marginBottom: 12 },
  row: { flexDirection: 'row', marginTop: 12 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#2b82ff', marginRight: 12 },
  btnText: { color: '#ffffff' },
  canvasBox: {
    flex: 1,
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2f36',
    backgroundColor: '#12151b',
  },
  overlay: {
    position: 'absolute',
    left: 10,
    top: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  overlayText: { color: '#fff', fontSize: 12 },
});
