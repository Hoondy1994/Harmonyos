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

  const handleGetSVGSize = () => {
    console.log('[App] ========== Calling getSVGSize (Enhanced) ==========');
    
    const RNSVGSvgViewModule = TurboModuleRegistry.get('RNSVGSvgViewModule');
    if (!RNSVGSvgViewModule) {
      console.error('[App] RNSVGSvgViewModule not found!');
      setResult('Error: RNSVGSvgViewModule not found');
      return;
    }

    // 获取 SVG 组件的 tag
    let svgTag: number | null = null;
    if (svgRef.current) {
      svgTag = findNodeHandle(svgRef.current);
      console.log('[App] SVG tag from findNodeHandle:', svgTag);
    }
    
    if (!svgTag) {
      console.warn('[App] Could not get SVG tag, trying with test tag 1');
      svgTag = 1;
    }
    
    // ========== JavaScript → C++ 传值 ==========
    console.log('[App] ========== JavaScript → C++ Values ==========');
    console.log('[App] Parameter 1 - tag (number):', svgTag);
    
    // 创建 options 对象，包含各种类型的值
    const options = {
      // 字符串类型 (string)
      unit: 'px1111',
      
      // 数字类型 (number)
      scale: 1.5,
      
      // 布尔类型 (boolean)
      includeAspectRatio: true,
      
      // 数组类型 (array)
      extraInfo: ['info1', 'info2', 'info3'],
      
      // 嵌套对象 (nested object)
      metadata: {
        source: 'react-native-svg',
        version: '1.0.0'
      }
    };
    
    console.log('[App] Parameter 2 - options (object):', JSON.stringify(options, null, 2));
    console.log('[App]   - unit (string):', options.unit);
    console.log('[App]   - scale (number):', options.scale);
    console.log('[App]   - includeAspectRatio (boolean):', options.includeAspectRatio);
    console.log('[App]   - extraInfo (array):', options.extraInfo);
    console.log('[App]   - metadata (nested object):', options.metadata);
    console.log('[App] ========== JavaScript → C++ Values Sent ==========');
    
    // 调用新的 JSI 接口（同步调用）
    try {
      console.log('[App] Calling getSVGSize with tag and options...');
      const sizeInfo = RNSVGSvgViewModule.getSVGSize(svgTag, options);
      
      // ========== C++ → JavaScript 传值 ==========
      console.log('[App] ========== C++ → JavaScript Values ==========');
      console.log('[App] Full result object:', JSON.stringify(sizeInfo, null, 2));
      
      if (sizeInfo.success) {
        // 基本类型：number
        console.log('[App]   - width (number):', sizeInfo.width);
        console.log('[App]   - height (number):', sizeInfo.height);
        
        // 基本类型：string
        console.log('[App]   - sizeString (string):', sizeInfo.sizeString);
        
        // 基本类型：boolean
        console.log('[App]   - success (boolean):', sizeInfo.success);
        
        // null 值
        console.log('[App]   - error (null):', sizeInfo.error);
        
        // 嵌套对象
        if (sizeInfo.sizeInfo) {
          console.log('[App]   - sizeInfo (nested object):', sizeInfo.sizeInfo);
          console.log('[App]     - sizeInfo.width:', sizeInfo.sizeInfo.width);
          console.log('[App]     - sizeInfo.height:', sizeInfo.sizeInfo.height);
          console.log('[App]     - sizeInfo.unit:', sizeInfo.sizeInfo.unit);
          if (sizeInfo.sizeInfo.aspectRatio) {
            console.log('[App]     - sizeInfo.aspectRatio:', sizeInfo.sizeInfo.aspectRatio);
          }
        }
        
        // 数组
        if (sizeInfo.dimensions) {
          console.log('[App]   - dimensions (array):', sizeInfo.dimensions);
        }
        
        // 回显的数组
        if (sizeInfo.receivedExtraInfo) {
          console.log('[App]   - receivedExtraInfo (array echo):', sizeInfo.receivedExtraInfo);
        }
        
        // 元数据对象
        if (sizeInfo.metadata) {
          console.log('[App]   - metadata (object):', sizeInfo.metadata);
        }
        
        console.log('[App] ========== C++ → JavaScript Values Received ==========');
        
        setResult(`SVG Size: ${sizeInfo.width} x ${sizeInfo.height} (${sizeInfo.sizeString})`);
      } else {
        console.error('[App] Error:', sizeInfo.error);
        setResult(`Error: ${sizeInfo.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[App] getSVGSize error:', error);
      setResult(`Error: ${error}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Svg ref={svgRef} width="100" height="100">
          <Path d="M90 0 L0 180 L180 180 Z" fill="red" />
        </Svg>
        
        <View style={styles.buttonContainer}>
          <Button title="调用 toDataURL" onPress={handleToDataURL} />
          <View style={{ marginTop: 10 }}>
            <Button title="调用 getSVGSize (新接口)" onPress={handleGetSVGSize} />
          </View>
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