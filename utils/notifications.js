import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export const registerForPushNotifications = async () => {
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

    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
};

export const savePushTokenToBackend = async (pushToken) => {
    try {
        const token = await AsyncStorage.getItem('token');
        const userId = await AsyncStorage.getItem('user_id');

        await fetch('https://freeway-chest-calzone.ngrok-free.dev/users/' + userId, {
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