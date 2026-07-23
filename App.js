import React, { useState, useEffect, useRef } from 'react';
import { ActivityIndicator, View, Animated, StyleSheet, Easing } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import OfflineBanner from './components/OfflineBanner';

import { AuthContext } from './utils/AuthContext';
import { LanguageProvider, LanguageContext } from './utils/LanguageContext';

import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import SearchScreen from './screens/SearchScreen';
import BookingsScreen from './screens/BookingsScreen';
import AccountScreen from './screens/AccountScreen';
import FacilityDetailsScreen from './screens/FacilityDetailsScreen';
import BookingReceiptScreen from './screens/BookingReceiptScreen';
import HostDashboardScreen from './screens/HostDashboardScreen';
import MapScreen from './screens/MapScreen';
import OnboardingScreen from './screens/OnboardingScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();

// --- ANIMATED SPLASH SCREEN COMPONENT ---
// --- ANIMATED SPLASH SCREEN COMPONENT ---
function AnimatedSplashScreen({ onAnimationComplete }) {
  const opacity = useRef(new Animated.Value(0)).current;
  // Start slightly larger (0.9 instead of 0.8) so the zoom isn't as jarring
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Cinematic fade and glide in simultaneously
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1000, // Slower, smoother fade
          easing: Easing.out(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 1000, // Replaced spring with a smooth easing timing
          easing: Easing.out(Easing.ease),
          useNativeDriver: true
        })
      ]),
      // 2. Hold the logo on screen for 1.2 seconds
      Animated.delay(1200),
      // 3. Fade out seamlessly into the home screen
      Animated.timing(opacity, {
        toValue: 0,
        duration: 600,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      })
    ]).start(() => onAnimationComplete());
  }, [opacity, scale, onAnimationComplete]);

  return (
    <View style={[StyleSheet.absoluteFill, styles.splashContainer]}>
      <Animated.Image
        source={require('./assets/splash.png')}
        style={[styles.splashImage, { opacity, transform: [{ scale }] }]}
      />
    </View>
  );
}

// --- NAVIGATION CONFIGURATION ---
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="MapScreen" component={MapScreen} />
    </HomeStack.Navigator>
  );
}

function PlayerTabs() {
  const { t } = React.useContext(LanguageContext);
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
      <Tab.Screen name="Home" component={HomeStackNavigator} options={{ tabBarLabel: t('nav_home') || 'Home' }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ tabBarLabel: t('nav_search') || 'Search' }} />
      <Tab.Screen name="Bookings" component={BookingsScreen} options={{ tabBarLabel: t('nav_bookings') || 'Bookings' }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ tabBarLabel: t('nav_account') || 'Account' }} />
    </Tab.Navigator>
  );
}

function HostTabs() {
  const { t } = React.useContext(LanguageContext);
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
      <Tab.Screen name="Home" component={HomeStackNavigator} options={{ tabBarLabel: t('nav_home') || 'Home' }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ tabBarLabel: t('nav_search') || 'Search' }} />
      <Tab.Screen name="Bookings" component={BookingsScreen} options={{ tabBarLabel: t('nav_bookings') || 'Bookings' }} />
      <Tab.Screen name="My Facilities" component={HostDashboardScreen} options={{ tabBarLabel: t('nav_facilities') || 'My Facilities' }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ tabBarLabel: t('nav_account') || 'Account' }} />
    </Tab.Navigator>
  );
}

function RootNavigator({ onboardingComplete }) {
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
          <>
            {!onboardingComplete && <Stack.Screen name="Onboarding" component={OnboardingScreen} />}
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={userRole === 'host' ? HostTabs : PlayerTabs} />
            <Stack.Screen name="FacilityDetails" component={FacilityDetailsScreen} />
            <Stack.Screen name="BookingReceipt" component={BookingReceiptScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// --- MAIN APP ENTRY ---
export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [authState, setAuthState] = useState({
    isLoading: true,
    userToken: null,
    userRole: null,
  });
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    async function prepare() {
      await SplashScreen.preventAutoHideAsync();
      try {
        const token = await SecureStore.getItemAsync('token');
        const role = await SecureStore.getItemAsync('role');
        const onboarded = await SecureStore.getItemAsync('onboarding_complete');
        setOnboardingComplete(!!onboarded);
        setAuthState({ isLoading: false, userToken: token, userRole: role });
      } catch (e) {
        console.warn(e);
        setAuthState({ isLoading: false, userToken: null, userRole: null });
      } finally {
        setAppReady(true);
        // Hide the native static splash immediately to let our React Native animation take over
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  const authContextValue = React.useMemo(
    () => ({
      signIn: async (token, role) => {
        await SecureStore.setItemAsync('token', token);
        await SecureStore.setItemAsync('role', role);
        setAuthState({ isLoading: false, userToken: token, userRole: role });
      },
      signOut: async () => {
        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync('role');
        setAuthState({ isLoading: false, userToken: null, userRole: null });
      },
    }),
    []
  );

  if (!appReady) return null;

  return (
    <AuthContext.Provider value={{ ...authState, ...authContextValue }}>
      <LanguageProvider>
        <>
          <OfflineBanner />
          {/* Load the actual app in the background so it's ready when the animation finishes */}
          <RootNavigator onboardingComplete={onboardingComplete} />

          {/* Overlay the custom animation on top of everything until it completes */}
          {!animationComplete && (
            <AnimatedSplashScreen onAnimationComplete={() => setAnimationComplete(true)} />
          )}
        </>
      </LanguageProvider>
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    backgroundColor: '#13294B',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999, // Guarantee it stays on top of the RootNavigator
  },
  splashImage: {
    width: 250,
    height: 250,
    resizeMode: 'contain',
  }
});