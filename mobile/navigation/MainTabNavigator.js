import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/HomeScreen';
import InventoryScreen from '../screens/InventoryScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import OfficeChatScreen from '../screens/OfficeChatScreen';

const Tab = createBottomTabNavigator();

// ─── Custom Tab Bar Icon ──────────────────────────────────────────────────────
function TabIcon({ emoji, label, focused }) {
  return (
    <View style={[tabIconStyles.wrapper]}>
      <Text style={[tabIconStyles.emoji, focused && tabIconStyles.emojiFocused]}>{emoji}</Text>
      <Text style={[tabIconStyles.label, focused && tabIconStyles.labelFocused]}>{label}</Text>
      {focused && <View style={tabIconStyles.activeDot} />}
    </View>
  );
}

const tabIconStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    paddingHorizontal: 8,
    gap: 3,
    minWidth: 80,
  },
  emoji: {
    fontSize: 22,
    opacity: 0.35,
  },
  emojiFocused: {
    opacity: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: '#718096',
    letterSpacing: 0.3,
  },
  labelFocused: {
    color: '#E53935',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E53935',
    marginTop: 1,
  },
});

// ─── Main Tab Navigator ────────────────────────────────────────────────────────
export default function MainTabNavigator({ route }) {
  const { user, token } = route?.params || {};
  const userRole = user?.role || 'client';

  const isSeller = userRole === 'seller';
  const isClient = userRole === 'client';

  return (
    <Tab.Navigator
      initialRouteName={isSeller ? "Appointments" : "Clients"}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopWidth: 1,
          borderTopColor: '#161822',
          height: Platform.OS === 'ios' ? 82 : 64,
          paddingTop: 4,
          paddingBottom: Platform.OS === 'ios' ? 22 : 8,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          // Show bottom tab bar for all roles
          display: 'flex',
        },
        tabBarShowLabel: false,
      }}
    >
      {/* ── TAB 1: Garage / HomeScreen (Only for Clients) ─────────────────────────── */}
      {isClient && (
        <Tab.Screen
          name="Clients"
          component={HomeScreen}
          initialParams={{ user, token }}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🚘" label="Garage" focused={focused} />
            ),
          }}
        />
      )}

      {/* ── TAB 2: Inventory (Only for Clients) ────────────────────────────────────── */}
      {isClient && (
        <Tab.Screen
          name="Inventory"
          component={InventoryScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🚗" label="Inventory" focused={focused} />
            ),
          }}
        />
      )}

      {/* ── TAB 3: Appointments (Sellers and Admins) ─────────── */}
      {(isSeller || userRole === 'admin') && (
        <Tab.Screen
          name="Appointments"
          component={AppointmentsScreen}
          initialParams={{ user, token }}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="📅" label="Appointments" focused={focused} />
            ),
          }}
        />
      )}

      {/* ── TAB 4: Office Chat (Sellers and Admins) ─────────── */}
      {(isSeller || userRole === 'admin') && (
        <Tab.Screen
          name="OfficeChat"
          component={OfficeChatScreen}
          initialParams={{ user, token }}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="💬" label="Chat" focused={focused} />
            ),
          }}
        />
      )}
    </Tab.Navigator>
  );
}
