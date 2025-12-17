import React, { useEffect, useRef } from 'react';
import { StyleSheet, SafeAreaView, Button, View, Text, findNodeHandle } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { TurboModuleRegistry } from 'react-native';

export default function App() {
  const svgRef = useRef<any>(null);
  const [result, setResult] = React.useState<string>('');

  useEffect(() => {
    console.log('[App] Component mounted, getting TurboModule...');
    
    // 获取 RNSVGSvgViewModule TurboModule
    const RNSVGSvgViewModule = TurboModuleRegistry.get('RNSVGSvgViewModule');
    console.log('[App] RNSVGSvgViewModule:', RNSVGSvgViewModule);
    
    if (!RNSVGSvgViewModule) {
      console.error('[App] RNSVGSvgViewModule not found!');
      setResult('Error: RNSVGSvgViewModule not found');
    }
  }, []);

  const handleToDataURL = () => {
    console.log('[App] Calling toDataURL...');
    
    const RNSVGSvgViewModule = TurboModuleRegistry.get('RNSVGSvgViewModule');
    if (!RNSVGSvgViewModule) {
      console.error('[App] RNSVGSvgViewModule not found!');
      setResult('Error: RNSVGSvgViewModule not found');
      return;
    }

    // 获取 SVG 组件的 tag (view tag)
    let svgTag: number | null = null;
    if (svgRef.current) {
      svgTag = findNodeHandle(svgRef.current);
      console.log('[App] SVG tag from findNodeHandle:', svgTag);
    }
    
    if (!svgTag) {
      console.warn('[App] Could not get SVG tag, trying with test tag 1');
      svgTag = 1; // 如果获取不到，使用测试 tag
    }
    
    console.log('[App] Calling toDataURL with tag:', svgTag);
    
    RNSVGSvgViewModule.toDataURL(
      svgTag,
      { width: 100, height: 100 }, // options
      (base64: string) => {
        console.log('[App] toDataURL callback received, base64 length:', base64.length);
        setResult(`Success! Base64 length: ${base64.length}`);
        // 可以在这里使用 base64，比如显示或保存
      }
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Svg ref={svgRef} width="100" height="100">
          <Path d="M90 0 L0 180 L180 180 Z" fill="red" />
        </Svg>
        
        <View style={styles.buttonContainer}>
          <Button title="调用 toDataURL" onPress={handleToDataURL} />
        </View>
        
        {result ? (
          <View style={styles.resultContainer}>
            <Text style={styles.resultText}>{result}</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'grey',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  resultContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 5,
  },
  resultText: {
    color: 'black',
    fontSize: 12,
  },
});