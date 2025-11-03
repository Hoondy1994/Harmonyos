import * as React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {Text, View, SectionList, TouchableOpacity} from 'react-native';
import SkiaCrashDemo from './src/pages/demos/SkiaCrashDemo';
import SkiaCrashDemo2 from './src/pages/demos/SkiaCrashDemo2';

const demoSections = [
    {
        title: '其他Demo',
        data: [
            {key: 'SkiaCrashDemo', title: 'Skia快速切换崩溃问题Demo1'},
            {key: 'SkiaCrashDemo2', title: 'Skia快速切换崩溃问题Demo2'},
        ],
    },
];

function HomeScreen({navigation}) {
    return (
        <SectionList
            sections={demoSections}
            renderItem={({item}) => (
                <TouchableOpacity
                    style={{
                        padding: 20,
                        marginVertical: 8,
                        backgroundColor: '#f0f0f0',
                        borderRadius: 8,
                        marginHorizontal: 16,
                        alignItems: 'center',
                    }}
                    onPress={() => navigation.navigate(item.key)}
                >
                    <Text style={{fontSize: 18}}>{item.title}</Text>
                </TouchableOpacity>
            )}
            renderSectionHeader={({section: {title}}) => (
                <View style={{backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8}}>
                    <Text style={{fontSize: 20, fontWeight: 'bold'}}>{title}</Text>
                </View>
            )}
            keyExtractor={item => item.key}
            contentContainerStyle={{paddingTop: 20, paddingBottom: 20}}
            style={{flex: 1, backgroundColor: '#fff'}}
        />
    );
}

const Stack = createNativeStackNavigator();

export const App = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen name="Home" component={HomeScreen} options={{title: 'Demo 列表'}}/>
                <Stack.Screen name={'SkiaCrashDemo'} component={SkiaCrashDemo} />
                <Stack.Screen name={'SkiaCrashDemo2'} component={SkiaCrashDemo2} />
                {/* 其他页面... */}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default App;
