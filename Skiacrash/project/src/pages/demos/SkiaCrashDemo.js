import React, {useState} from 'react';
import {Canvas, Group, Circle} from '@shopify/react-native-skia';
import {Text} from 'react-native';

const width = 256;
const height = 256;
const r = width * 0.33;

const SkiaTestItem1 = () => {
    return (
        <Canvas style={{width, height}}>
            <Group blendMode="multiply">
                <Circle cx={r} cy={r} r={r} color="cyan" />
                <Circle cx={width - r} cy={r} r={r} color="magenta" />
                <Circle cx={width / 2} cy={width - r} r={r} color="yellow" />
            </Group>
        </Canvas>
    );
};

const SkiaTestItem2 = () => {
    return (
        <Canvas style={{width, height}}>
            <Group blendMode="multiply">
                <Circle cx={r} cy={r} r={r} color="magenta" />
                <Circle cx={width - r} cy={r} r={r} color="yellow" />
                <Circle cx={width / 2} cy={width - r} r={r} color="cyan" />
            </Group>
        </Canvas>
    );
};


export const SkiaCrashDemo = () => {
    const [showFirst, setShowFirst] = useState(true);

    const handlePress = () => {
        setShowFirst(prev => !prev);
    };

    return (
        <>
            <Text
                onPress={handlePress}
                style={{marginBottom: 10, color: 'blue', fontSize: 50}}
            >
                切换
            </Text>
            {showFirst ? <SkiaTestItem1 /> : <SkiaTestItem2 />}
        </>
    );
};

export default SkiaCrashDemo;
