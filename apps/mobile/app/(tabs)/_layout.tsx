import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { View } from 'react-native';

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#000000',
            borderTopWidth: 0,
            elevation: 0,
            height: 80,
            paddingBottom: 20
          },
          tabBarActiveTintColor: '#ffffff',
          tabBarInactiveTintColor: '#555555',
          tabBarShowLabel: false,
          sceneStyle: { backgroundColor: '#000000' }
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />
          }}
        />
        <Tabs.Screen
          name="trip"
          options={{
            tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />
          }}
        />
      </Tabs>
    </View>
  );
}
