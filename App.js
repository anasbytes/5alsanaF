import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';

import { AuthContext } from './utils/AuthContext';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import SearchScreen from './screens/SearchScreen';
import BookingsScreen from './screens/BookingsScreen';
import AccountScreen from './screens/AccountScreen';
import FacilityDetailsScreen from './screens/FacilityDetailsScreen';
import HostDashboardScreen from './screens/HostDashboardScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="FacilityDetails" component={FacilityDetailsScreen} />
    </HomeStack.Navigator>
  );
}

function PlayerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Search') iconName = focused ? 'search' : 'search-outline';
          else if (route.name === 'Bookings') iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'Account') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#E8751A',
        tabBarInactiveTintColor: '#888888',
        tabBarStyle: { backgroundColor: '#F9F6F0', borderTopColor: '#D4D0C8', borderTopWidth: 1 },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

function HostTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Search') iconName = focused ? 'search' : 'search-outline';
          else if (route.name === 'Bookings') iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'My Facilities') iconName = focused ? 'business' : 'business-outline';
          else if (route.name === 'Account') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#E8751A',
        tabBarInactiveTintColor: '#888888',
        tabBarStyle: { backgroundColor: '#F9F6F0', borderTopColor: '#D4D0C8', borderTopWidth: 1 },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
      <Tab.Screen name="My Facilities" component={HostDashboardScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { userToken, userRole, isLoading } = React.useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9F6F0' }}>
        <ActivityIndicator size="large" color="#E8751A" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {userToken == null ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="MainTabs" component={userRole === 'host' ? HostTabs : PlayerTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [authState, setAuthState] = useState({
    isLoading: true,
    userToken: null,
    userRole: null,
  });

  useEffect(() => {
    async function prepare() {
      await SplashScreen.preventAutoHideAsync();
      try {
        const token = await AsyncStorage.getItem('token');
        const role = await AsyncStorage.getItem('role');
        setAuthState({ isLoading: false, userToken: token, userRole: role });
      } catch (e) {
        console.warn(e);
        setAuthState({ isLoading: false, userToken: null, userRole: null });
      } finally {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await SplashScreen.hideAsync();
        setAppReady(true);
      }
    }
    prepare();
  }, []);

  const authContextValue = React.useMemo(
    () => ({
      signIn: async (token, role) => {
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('role', role);
        setAuthState({ isLoading: false, userToken: token, userRole: role });
      },
      signOut: async () => {
        await AsyncStorage.clear();
        setAuthState({ isLoading: false, userToken: null, userRole: null });
      },
    }),
    []
  );

  if (!appReady) return null;

  return (
    <AuthContext.Provider value={{ ...authState, ...authContextValue }}>
      <RootNavigator />
    </AuthContext.Provider>
  );
}