import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Keyboard, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { registerForPushNotifications, savePushTokenToBackend } from '../utils/notifications';
import { AuthContext } from '../utils/AuthContext';
// 🌐 Import the Language Context
import { LanguageContext } from '../utils/LanguageContext';

const LoginScreen = () => {
    const { signIn } = useContext(AuthContext);
    // 🌐 Use the global language context
    const { language, changeLanguage, t } = useContext(LanguageContext);

    const [isLogin, setIsLogin] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [role, setRole] = useState('player');

    const [identifier, setIdentifier] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [errorKey, setErrorKey] = useState('');

    const fadeAnim = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({ opacity: fadeAnim.value }));

    const triggerFade = (action) => {
        fadeAnim.value = withTiming(0, { duration: 150 });
        setTimeout(() => {
            action();
            fadeAnim.value = withTiming(1, { duration: 300 });
        }, 150);
    };

    const handleSubmit = async () => {
        Keyboard.dismiss();
        setErrorKey('');
        setIsSubmitting(true);

        const backendUrl = process.env.EXPO_PUBLIC_API_URL;

        try {
            const endpoint = isLogin ? '/auth/login' : '/auth/register';
            const body = isLogin
                ? { identifier, password }
                : { username, email, phone_number: phoneNumber, password, role };

            const response = await fetch(`${backendUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true',
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (response.ok) {
                await signIn(data.token, data.user.role);

                try {
                    const pushToken = await registerForPushNotifications();
                    if (pushToken) await savePushTokenToBackend(pushToken);
                } catch (e) {
                    console.log('Push setup failed (non-critical):', e.message);
                }
            } else {
                if (isLogin) {
                    setErrorKey('invalidCredentials');
                } else {
                    const backendError = String(data.error || '').toLowerCase();
                    setErrorKey(backendError.includes('taken') ? 'userExists' : 'signupFailed');
                }
            }
        } catch (err) {
            setErrorKey('networkError');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 🌐 Local dictionary specifically for Login (The rest of the app uses LanguageContext.js)
    const localT = {
        en: {
            signUp: 'Sign Up', logIn: 'Log In', usernamePlaceholder: 'Username or Phone Number',
            usernamePlaceholder2: 'Username', phonePlaceholder: 'Phone Number', emailPlaceholder: 'Email (Optional)',
            passwordPlaceholder: 'Password', player: 'Player', host: 'Host', english: 'English', arabic: 'Arabic',
            invalidCredentials: 'Invalid credentials. Please try again.', signupFailed: 'Failed to create account. Please check your inputs.',
            networkError: 'Network Error. Please check your connection.', userExists: 'Username or phone number is already taken.',
        },
        ar: {
            signUp: 'تسجيل', logIn: 'دخول', usernamePlaceholder: 'اسم المستخدم أو رقم الهاتف',
            usernamePlaceholder2: 'اسم المستخدم', phonePlaceholder: 'رقم الهاتف', emailPlaceholder: 'البريد الإلكتروني (اختياري)',
            passwordPlaceholder: 'كلمة المرور', player: 'لاعب', host: 'منظم', english: 'English', arabic: 'العربية',
            invalidCredentials: 'بيانات الدخول غير صحيحة. يرجى المحاولة مرة أخرى.', signupFailed: 'فشل في إنشاء الحساب. يرجى التحقق من البيانات.',
            networkError: 'خطأ في الشبكة. يرجى التحقق من اتصالك.', userExists: 'اسم المستخدم أو رقم الهاتف مسجل بالفعل.',
        },
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={[styles.innerContainer, { direction: language === 'ar' ? 'rtl' : 'ltr' }]}>

                <View style={styles.langContainer}>
                    <TouchableOpacity
                        style={[styles.langButton, language === 'en' && styles.activeLangButton]}
                        onPress={() => { if (language !== 'en') changeLanguage('en'); }} // 🌐 Uses global change
                    >
                        <Text style={[styles.langText, language === 'en' && styles.activeLangText]}>{localT[language].english}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.langButton, language === 'ar' && styles.activeLangButton]}
                        onPress={() => { if (language !== 'ar') changeLanguage('ar'); }} // 🌐 Uses global change
                    >
                        <Text style={[styles.langText, language === 'ar' && styles.activeLangText]}>{localT[language].arabic}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleButton, !isLogin && styles.activeToggle]}
                        onPress={() => { if (isLogin) triggerFade(() => { setIsLogin(false); setErrorKey(''); }); }}
                    >
                        <Text style={[styles.toggleText, !isLogin && styles.activeToggleText]}>{localT[language].signUp}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleButton, isLogin && styles.activeToggle]}
                        onPress={() => { if (!isLogin) triggerFade(() => { setIsLogin(true); setErrorKey(''); }); }}
                    >
                        <Text style={[styles.toggleText, isLogin && styles.activeToggleText]}>{localT[language].logIn}</Text>
                    </TouchableOpacity>
                </View>

                <Animated.View style={[styles.formContainer, animatedStyle]}>
                    <Text style={styles.headerTitle}>{isLogin ? localT[language].logIn : localT[language].signUp}</Text>

                    {errorKey ? <Text style={styles.errorText}>{localT[language][errorKey]}</Text> : null}

                    {isLogin ? (
                        <TextInput
                            style={[styles.input, { textAlign: language === 'ar' ? 'right' : 'left' }]} // 🌐 Text align fix
                            placeholder={localT[language].usernamePlaceholder}
                            placeholderTextColor="#A0A0A0"
                            value={identifier}
                            onChangeText={setIdentifier}
                            autoCapitalize="none"
                            editable={!isSubmitting}
                        />
                    ) : (
                        <TextInput
                            style={[styles.input, { textAlign: language === 'ar' ? 'right' : 'left' }]} // 🌐 Text align fix
                            placeholder={localT[language].usernamePlaceholder2}
                            placeholderTextColor="#A0A0A0"
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                            editable={!isSubmitting}
                        />
                    )}

                    {!isLogin && (
                        <>
                            <TextInput
                                style={[styles.input, { textAlign: language === 'ar' ? 'right' : 'left' }]}
                                placeholder={localT[language].phonePlaceholder}
                                placeholderTextColor="#A0A0A0"
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                                keyboardType="phone-pad"
                                editable={!isSubmitting}
                            />
                            <TextInput
                                style={[styles.input, { textAlign: language === 'ar' ? 'right' : 'left' }]}
                                placeholder={localT[language].emailPlaceholder}
                                placeholderTextColor="#A0A0A0"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                editable={!isSubmitting}
                            />
                        </>
                    )}

                    <TextInput
                        style={[styles.input, { textAlign: language === 'ar' ? 'right' : 'left' }]}
                        placeholder={localT[language].passwordPlaceholder}
                        placeholderTextColor="#A0A0A0"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={true}
                        editable={!isSubmitting}
                    />

                    {!isLogin && (
                        <View style={styles.roleContainer}>
                            <TouchableOpacity
                                style={[styles.roleButton, role === 'player' && styles.activeRole]}
                                onPress={() => setRole('player')}
                            >
                                <Text style={[styles.roleText, role === 'player' && styles.activeRoleText]}>{localT[language].player}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.roleButton, role === 'host' && styles.activeRole]}
                                onPress={() => setRole('host')}
                            >
                                <Text style={[styles.roleText, role === 'host' && styles.activeRoleText]}>{localT[language].host}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.submitButtonText}>{isLogin ? localT[language].logIn : localT[language].signUp}</Text>
                        )}
                    </TouchableOpacity>
                </Animated.View>

                <View style={styles.logoContainer}>
                    <Image
                        source={require('../assets/icon.png')}
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
    toggleContainer: {
        flexDirection: 'row', backgroundColor: '#F9F6F0', borderRadius: 14, height: 52,
        marginBottom: 20, borderWidth: 1, borderColor: '#D4D0C8', padding: 5
    },
    toggleButton: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
    activeToggle: { backgroundColor: '#13294B' },
    toggleText: { fontSize: 14, fontWeight: '800', color: '#888888' },
    activeToggleText: { color: '#FFFFFF' },
    formContainer: {
        width: '100%', backgroundColor: '#FFFFFF', padding: 25, borderRadius: 16,
        borderWidth: 1, borderColor: '#D4D0C8',
        shadowColor: '#13294B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3
    },
    headerTitle: { fontSize: 26, fontWeight: '900', color: '#13294B', textAlign: 'center', marginBottom: 20, letterSpacing: -0.5 },
    errorText: { color: '#D32F2F', fontSize: 14, fontWeight: '800', textAlign: 'center', marginBottom: 15 },
    input: {
        backgroundColor: '#F9F6F0', height: 52, borderRadius: 12, paddingHorizontal: 15,
        marginBottom: 15, borderWidth: 1, borderColor: '#D4D0C8', fontSize: 15, color: '#13294B', fontWeight: '600'
    },
    roleContainer: {
        flexDirection: 'row', backgroundColor: '#F9F6F0', borderRadius: 12, height: 45,
        marginTop: 5, marginBottom: 20, borderWidth: 1, borderColor: '#D4D0C8', padding: 4
    },
    roleButton: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
    activeRole: { backgroundColor: '#13294B' },
    roleText: { fontSize: 13, fontWeight: '800', color: '#888888' },
    activeRoleText: { color: '#FFFFFF' },
    submitButton: {
        backgroundColor: '#E8751A', height: 52, justifyContent: 'center', alignItems: 'center',
        borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: '#E8751A',
        shadowColor: '#E8751A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3
    },
    submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
    logoContainer: { position: 'absolute', bottom: 35, alignSelf: 'center', zIndex: -1 },
    logoImage: { width: 90, height: 90, borderRadius: 18 },
});

export default LoginScreen;