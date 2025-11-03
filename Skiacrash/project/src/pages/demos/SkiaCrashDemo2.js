import React, {useState} from 'react';
import fontSource from '../../res/font/arial.ttf';
import {Canvas, useFont, Text as skText} from '@shopify/react-native-skia';
import {Text} from 'react-native';

const SkiaTestItem1 = () => {
    const font = useFont(fontSource, 12);

    return (
        <Canvas style={{width: 200, height: 300, backgroundColor: 'grey'}}>
            <skText x={100} y={100} font={font} text={'Hello Skia1!'} />
        </Canvas>
    );
};

const SkiaTestItem2 = () => {
    const font = useFont(fontSource, 12);

    return (
        <Canvas style={{width: 200, height: 300, backgroundColor: 'grey'}}>
            <skText x={100} y={100} font={font} text={'Hello Skia2!'} />
        </Canvas>
    );
};

export const SkiaCrashDemo2 = () => {
    const [showFirst, setShowFirst] = useState(true);

    const handlePress = () => {
        setShowFirst(prev => !prev);
    };

    return (
        <React.Fragment>
            <Text
                onPress={handlePress}
                style={{marginBottom: 10, color: 'blue', fontSize: 30}}
            >
                切换
            </Text>
            {showFirst ? <SkiaTestItem1 /> : <SkiaTestItem2 />}
        </React.Fragment>
    );
};

export default SkiaCrashDemo2;
