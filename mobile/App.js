import React from 'react';
import { Image, View, Text, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import AdminDashboard from './screens/AdminDashboard';
import SellerDashboard from './screens/SellerDashboard';
import AppointmentsScreen from './screens/AppointmentsScreen';
import OfficeChatScreen from './screens/OfficeChatScreen';
import StockUsatoScreen from './screens/StockUsatoScreen';
import PortalHubScreen from './screens/PortalHubScreen';
import PortalListScreen from './screens/PortalListScreen';
import PortalCarDetailScreen from './screens/PortalCarDetailScreen';
import PortalShowcaseScreen from './screens/PortalShowcaseScreen';
import PortalShowcaseDetailScreen from './screens/PortalShowcaseDetailScreen';
import MainTabNavigator from './navigation/MainTabNavigator';

import * as Updates from 'expo-updates';

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: [
    'https://rossomandi-auto-srl.vercel.app',
    'https://rossomandi-backend.vercel.app',
    'http://localhost:5000',
    'http://localhost:8081',
    'mobile://',
  ],
  config: {
    screens: {
      Login: '',
      Signup: 'signup',
      AdminDashboard: 'admin',
      SellerDashboard: 'seller',
      Appointments: 'appointments',
      OfficeChat: 'chat',
      StockUsato: 'stock',
      PortalHub: 'hub',
      PortalShowcase: 'portale',
      PortalShowcaseDetail: 'portale/:id',
    },
  },
};

export default function App() {
  React.useEffect(() => {
    async function checkForUpdates() {
      if (Platform.OS !== 'web' && !__DEV__) {
        try {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
          }
        } catch (e) {
          console.log('Update check note:', e.message);
        }
      }
    }
    checkForUpdates();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer linking={linking}>
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

          {/* Stock Usato Inventory view stack entry */}
          <Stack.Screen 
            name="StockUsato" 
            component={StockUsatoScreen} 
            options={{ headerShown: false }} 
          />

          {/* Portale Hub & Sub-screens */}
          <Stack.Screen 
            name="PortalHub" 
            component={PortalHubScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="PortalList" 
            component={PortalListScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="PortalCarDetail" 
            component={PortalCarDetailScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="PortalShowcase" 
            component={PortalShowcaseScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="PortalShowcaseDetail" 
            component={PortalShowcaseDetailScreen} 
            options={{ headerShown: false }} 
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
