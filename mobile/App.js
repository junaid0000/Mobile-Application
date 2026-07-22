import React from 'react';
import { Image, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import AdminDashboard from './screens/AdminDashboard';
import SellerDashboard from './screens/SellerDashboard';
import AppointmentsScreen from './screens/AppointmentsScreen';
import OfficeChatScreen from './screens/OfficeChatScreen';
import MainTabNavigator from './navigation/MainTabNavigator';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0F0F13' },
          }}
        >
          {/* Auth screens */}
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />

          {/* Seller / Staff Dashboard */}
          <Stack.Screen name="SellerDashboard" component={SellerDashboard} />

          {/* Client: 3-tab bottom navigation */}
          <Stack.Screen
            name="MainTabs"
            component={MainTabNavigator}
            options={{ animation: 'fade' }}
          />

          {/* Admin: full-screen dashboard */}
          <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
          
          {/* Admin Appointments view stack entry */}
          <Stack.Screen name="Appointments" component={AppointmentsScreen} />
          
          {/* Admin Office Chat view stack entry */}
          <Stack.Screen 
            name="OfficeChat" 
            component={OfficeChatScreen} 
            options={{ headerShown: false }} 
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
