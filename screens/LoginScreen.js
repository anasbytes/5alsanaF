import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { registerForPushNotifications, savePushTokenToBackend } from '../utils/notifications';

const LoginScreen = ({ navigation }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [language, setLanguage] = useState('en');
    const [role, setRole] = useState('player');

    const [identifier, setIdentifier] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [errorKey, setErrorKey] = useState('');

    const fadeAnim = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
        return { opacity: fadeAnim.value };
    });

    const triggerFade = (stateUpdater) => {
        fadeAnim.value = withTiming(0, { duration: 150 });
        setTimeout(() => {
            stateUpdater();
            fadeAnim.value = withTiming(1, { duration: 300 });
        }, 150);
    };

    const handleSubmit = async () => {
        setErrorKey('');
        const backendUrl = 'https://freeway-chest-calzone.ngrok-free.dev';

        if (isLogin) {
            try {
                const response = await fetch(`${backendUrl}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'ngrok-skip-browser-warning': 'true',
                    },
                    body: JSON.stringify({ identifier, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    await AsyncStorage.setItem('token', data.token);
                    await AsyncStorage.setItem('role', data.user.role);
                    const actualUserId = data.user?.id || data.userId || data.user_id || data.id;
                    if (actualUserId) {
                        await AsyncStorage.setItem('user_id', actualUserId.toString());
                    }
                try {
                    const pushToken = await registerForPushNotifications();
                    if (pushToken) await savePushTokenToBackend(pushToken);
                } catch (e) {
                    console.log('Push token error:', e.message);
                }
                    navigation.replace('MainTabs');
                } else {
                    setErrorKey('invalidCredentials');
                }
            } catch (err) {
                setErrorKey('networkError');
            }
        } else {
            try {
                const response = await fetch(`${backendUrl}/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'ngrok-skip-browser-warning': 'true',
                    },
                    body: JSON.stringify({
                        username,
                        email,
                        phone_number: phoneNumber,
                        password,
                        role
                    }),
                });

                const data = await response.json();

                if (response.ok) {
                    await AsyncStorage.setItem('token', data.token);
                    await AsyncStorage.setItem('role', data.user.role);
                    const actualUserId = data.user?.id || data.userId || data.user_id || data.id;
                    if (actualUserId) {
                        await AsyncStorage.setItem('user_id', actualUserId.toString());
                    }
                    try {
                            const pushToken = await registerForPushNotifications();
                            if (pushToken) await savePushTokenToBackend(pushToken);
                        } catch (e) {
                            console.log('Push token error:', e.message);
                        }
                    navigation.replace('MainTabs');
                } else {
                    const backendError = String(data.error || '').toLowerCase();
                    if (backendError.includes('exist') || backendError.includes('taken')) {
                        setErrorKey('userExists');
                    } else {
                        setErrorKey('signupFailed');
                    }
                }
            } catch (err) {
                setErrorKey('networkError');
            }
        }
    };

    const t = {
        en: {
            signUp: 'Sign Up',
            logIn: 'Log In',
            usernamePlaceholder: 'Username or Phone Number',
            usernamePlaceholder2: 'Username',
            phonePlaceholder: 'Phone Number',
            emailPlaceholder: 'Email (Optional)',
            passwordPlaceholder: 'Password',
            player: 'Player',
            host: 'Host',
            english: 'English',
            arabic: 'العربية',
            invalidCredentials: 'Invalid credentials. Please try again.',
            signupFailed: 'Failed to create account. Please check your inputs.',
            networkError: 'Network Error. Please check your connection.',
            userExists: 'Username or phone number is already taken.',
        },
        ar: {
            signUp: 'تسجيل',
            logIn: 'دخول',
            usernamePlaceholder: 'اسم المستخدم أو رقم الهاتف',
            usernamePlaceholder2: 'اسم المستخدم',
            phonePlaceholder: 'رقم الهاتف',
            emailPlaceholder: 'البريد الإلكتروني (اختياري)',
            passwordPlaceholder: 'كلمة المرور',
            player: 'لاعب',
            host: 'منظم',
            english: 'English',
            arabic: 'العربية',
            invalidCredentials: 'بيانات الدخول غير صحيحة. يرجى المحاولة مرة أخرى.',
            signupFailed: 'فشل في إنشاء الحساب. يرجى التحقق من البيانات.',
            networkError: 'خطأ في الشبكة. يرجى التحقق من اتصالك.',
            userExists: 'اسم المستخدم أو رقم الهاتف مسجل بالفعل.',
        },
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={[styles.innerContainer, { direction: language === 'ar' ? 'rtl' : 'ltr' }]}>
                
                {/* Language Toggle */}
                <View style={styles.langContainer}>
                    <TouchableOpacity
                        style={[styles.langButton, language === 'en' && styles.activeLangButton]}
                        onPress={() => { if (language !== 'en') triggerFade(() => setLanguage('en')); }}
                    >
                        <Text style={[styles.langText, language === 'en' && styles.activeLangText]}>{t[language].english}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.langButton, language === 'ar' && styles.activeLangButton]}
                        onPress={() => { if (language !== 'ar') triggerFade(() => setLanguage('ar')); }}
                    >
                        <Text style={[styles.langText, language === 'ar' && styles.activeLangText]}>{t[language].arabic}</Text>
                    </TouchableOpacity>
                </View>

                {/* Main Auth Toggle */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleButton, !isLogin && styles.activeToggle]}
                        onPress={() => { if (isLogin) triggerFade(() => { setIsLogin(false); setErrorKey(''); }); }}
                    >
                        <Text style={[styles.toggleText, !isLogin && styles.activeToggleText]}>{t[language].signUp}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleButton, isLogin && styles.activeToggle]}
                        onPress={() => { if (!isLogin) triggerFade(() => { setIsLogin(true); setErrorKey(''); }); }}
                    >
                        <Text style={[styles.toggleText, isLogin && styles.activeToggleText]}>{t[language].logIn}</Text>
                    </TouchableOpacity>
                </View>

                {/* Form Card */}
                <Animated.View style={[styles.formContainer, animatedStyle]}>
                    <Text style={styles.headerTitle}>{isLogin ? t[language].logIn : t[language].signUp}</Text>

                    {errorKey ? <Text style={styles.errorText}>{t[language][errorKey]}</Text> : null}

                    {isLogin ? (
                        <TextInput
                            style={styles.input}
                            placeholder={t[language].usernamePlaceholder}
                            placeholderTextColor="#A0A0A0"
                            value={identifier}
                            onChangeText={setIdentifier}
                            autoCapitalize="none"
                        />
                    ) : (
                        <TextInput
                            style={styles.input}
                            placeholder={t[language].usernamePlaceholder2}
                            placeholderTextColor="#A0A0A0"
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                        />
                    )}

                    {!isLogin && (
                        <>
                            <TextInput
                                style={styles.input}
                                placeholder={t[language].phonePlaceholder}
                                placeholderTextColor="#A0A0A0"
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                                keyboardType="phone-pad"
                            />
                            <TextInput
                                style={styles.input}
                                placeholder={t[language].emailPlaceholder}
                                placeholderTextColor="#A0A0A0"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </>
                    )}

                    <TextInput
                        style={styles.input}
                        placeholder={t[language].passwordPlaceholder}
                        placeholderTextColor="#A0A0A0"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={true}
                    />

                    {!isLogin && (
                        <View style={styles.roleContainer}>
                            <TouchableOpacity
                                style={[styles.roleButton, role === 'player' && styles.activeRole]}
                                onPress={() => setRole('player')}
                            >
                                <Text style={[styles.roleText, role === 'player' && styles.activeRoleText]}>{t[language].player}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.roleButton, role === 'host' && styles.activeRole]}
                                onPress={() => setRole('host')}
                            >
                                <Text style={[styles.roleText, role === 'host' && styles.activeRoleText]}>{t[language].host}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                        <Text style={styles.submitButtonText}>{isLogin ? t[language].logIn : t[language].signUp}</Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* Logo */}
                <View style={styles.logoContainer}>
                    <Image
                        source={require('../assets/logo.png')}
                        style={styles.logoImage}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                        transition={200}
                    />
                </View>
                
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F9F6F0' },
    innerContainer: { flex: 1, paddingHorizontal: 25, justifyContent: 'center', paddingBottom: 140, paddingTop: 30 },
    
    // Language Toggle
    langContainer: {
        flexDirection: 'row', backgroundColor: '#F9F6F0', borderRadius: 12, width: 170,
        alignSelf: 'center', padding: 4, marginBottom: 35, borderWidth: 1, borderColor: '#D4D0C8',
    },
    langButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    activeLangButton: {
        backgroundColor: '#FFFFFF', elevation: 2, shadowColor: '#13294B',
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
        borderWidth: 1, borderColor: '#EAE6DF'
    },
    langText: { fontSize: 12, fontWeight: '800', color: '#888888', textTransform: 'uppercase' },
    activeLangText: { color: '#13294B' }, 
    
    // Main Toggle (Login / Signup)
    toggleContainer: {
        flexDirection: 'row', backgroundColor: '#F9F6F0', borderRadius: 14, height: 52,
        marginBottom: 20, borderWidth: 1, borderColor: '#D4D0C8', padding: 5
    },
    toggleButton: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
    activeToggle: { backgroundColor: '#13294B' }, 
    toggleText: { fontSize: 14, fontWeight: '800', color: '#888888' },
    activeToggleText: { color: '#FFFFFF' },
    
    // Form Card
    formContainer: { 
        width: '100%', backgroundColor: '#FFFFFF', padding: 25, borderRadius: 16, 
        borderWidth: 1, borderColor: '#D4D0C8', 
        shadowColor: '#13294B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 
    },
    headerTitle: { fontSize: 26, fontWeight: '900', color: '#13294B', textAlign: 'center', marginBottom: 20, letterSpacing: -0.5 },
    errorText: { color: '#D32F2F', fontSize: 14, fontWeight: '800', textAlign: 'center', marginBottom: 15 },
    
    // Inputs
    input: {
        backgroundColor: '#F9F6F0', height: 52, borderRadius: 12, paddingHorizontal: 15,
        marginBottom: 15, borderWidth: 1, borderColor: '#D4D0C8', fontSize: 15, color: '#13294B', fontWeight: '600'
    },
    
    // Role Toggle
    roleContainer: {
        flexDirection: 'row', backgroundColor: '#F9F6F0', borderRadius: 12, height: 45,
        marginTop: 5, marginBottom: 20, borderWidth: 1, borderColor: '#D4D0C8', padding: 4
    },
    roleButton: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
    activeRole: { backgroundColor: '#13294B' }, 
    roleText: { fontSize: 13, fontWeight: '800', color: '#888888' },
    activeRoleText: { color: '#FFFFFF' },
    
    // Submit Button
    submitButton: {
        backgroundColor: '#E8751A', height: 52, justifyContent: 'center', alignItems: 'center',
        borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: '#E8751A',
        shadowColor: '#E8751A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 
    },
    submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
    
    // Logo
    logoContainer: { position: 'absolute', bottom: 35, alignSelf: 'center', zIndex: -1 },
    logoImage: { width: 90, height: 90, borderRadius: 18 },
});


export default LoginScreen;