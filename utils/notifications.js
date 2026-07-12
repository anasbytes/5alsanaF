import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export const registerForPushNotifications = async () => {
    let token;

    // 1. Must be a physical device (Push notifications don't work on iOS Simulators)
    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
            console.log('Push notification permission denied.');
            return null;
        }

        // 2. EAS Build readiness: Safely retrieve the projectId
        try {
            const projectId =
                Constants?.expoConfig?.extra?.eas?.projectId ??
                Constants?.easConfig?.projectId;

            if (!projectId) {
                // Fallback for bare Expo Go testing if projectId isn't configured yet
                token = (await Notifications.getExpoPushTokenAsync()).data;
            } else {
                // Production-safe token retrieval
                token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
            }
        } catch (e) {
            console.log('Error getting push token:', e);
            return null;
        }
    } else {
        console.log('Must use physical device for Push Notifications');
        return null;
    }

    // 3. Android Requirement: Set up a default channel
    if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#E8751A', // Your premium Orange!
        });
    }

    return token;
};

export const savePushTokenToBackend = async (pushToken) => {
    try {
        const token = await AsyncStorage.getItem('token');

        // FIX: Replaced /users/${userId} with /users/me for security
        await fetch('https://freeway-chest-calzone.ngrok-free.dev/users/me', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ push_token: pushToken })
        });
    } catch (err) {
        console.error('Error saving push token:', err);
    }
};