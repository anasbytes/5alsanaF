import React, { useRef, useState, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Dimensions, SafeAreaView } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { LanguageContext } from '../utils/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }) {
    const { t, language } = useContext(LanguageContext);
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef(null);
    const isRTL = language === 'ar';

    const slides = [
        {
            key: '1',
            title: t('onboarding_welcome'),
            subtitle: t('onboarding_welcome_sub'),
            showLogo: true,
        },
        {
            key: '2',
            title: t('onboarding_how_title'),
            subtitle: t('onboarding_how_sub'),
            showLogo: false,
        },
        {
            key: '3',
            title: t('onboarding_start_title'),
            subtitle: t('onboarding_start_sub'),
            showLogo: false,
            isFinal: true,
        },
    ];

    const complete = async (route) => {
        await SecureStore.setItemAsync('onboarding_complete', 'true');
        navigation.replace(route);
    };

    const next = () => {
        if (currentIndex < slides.length - 1) {
            flatListRef.current.scrollToIndex({ index: currentIndex + 1 });
            setCurrentIndex(currentIndex + 1);
        }
    };

    const renderSlide = ({ item }) => (
        <View style={styles.slide}>
            {item.showLogo && (
                <Image source={require('../assets/icon.png')} style={styles.logo} />
            )}
            <Text style={[styles.title, isRTL && styles.rtlText]}>{item.title}</Text>
            <Text style={[styles.subtitle, isRTL && styles.rtlText]}>{item.subtitle}</Text>
            {item.isFinal && (
                <View style={styles.finalButtons}>
                    <TouchableOpacity style={styles.primaryBtn} onPress={() => complete('Login')}>
                        <Text style={styles.primaryBtnText}>{t('onboarding_login')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryBtn} onPress={() => complete('Login')}>
                        <Text style={styles.secondaryBtnText}>{t('onboarding_signup')}</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <TouchableOpacity style={styles.skipBtn} onPress={() => complete('Login')}>
                <Text style={styles.skipText}>{t('onboarding_skip')}</Text>
            </TouchableOpacity>

            <FlatList
                ref={flatListRef}
                data={slides}
                renderItem={renderSlide}
                keyExtractor={item => item.key}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEnabled={false}
            />

            <View style={styles.footer}>
                <View style={styles.dots}>
                    {slides.map((_, i) => (
                        <View key={i} style={[styles.dot, currentIndex === i && styles.dotActive]} />
                    ))}
                </View>
                {currentIndex < slides.length - 1 && (
                    <TouchableOpacity style={styles.nextBtn} onPress={next}>
                        <Text style={styles.nextBtnText}>{t('onboarding_next')}</Text>
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9F6F0' },
    skipBtn: { alignSelf: 'flex-end', padding: 16 },
    skipText: { color: '#888', fontSize: 14 },
    slide: {
        width: SCREEN_WIDTH,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    logo: { width: 120, height: 120, resizeMode: 'contain', marginBottom: 32 },
    title: { fontSize: 26, fontWeight: '700', color: '#1A1A1A', textAlign: 'center', marginBottom: 16 },
    subtitle: { fontSize: 16, color: '#555', textAlign: 'center', lineHeight: 24 },
    rtlText: { textAlign: 'center' },
    finalButtons: { marginTop: 32, width: '100%', gap: 12 },
    primaryBtn: {
        backgroundColor: '#E8751A',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    secondaryBtn: {
        backgroundColor: '#fff',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#E8751A',
    },
    secondaryBtnText: { color: '#E8751A', fontWeight: '700', fontSize: 16 },
    footer: { paddingBottom: 32, alignItems: 'center', gap: 16 },
    dots: { flexDirection: 'row', gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#C0BAB0' },
    dotActive: { width: 20, backgroundColor: '#E8751A' },
    nextBtn: {
        backgroundColor: '#E8751A',
        paddingVertical: 14,
        paddingHorizontal: 48,
        borderRadius: 12,
    },
    nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});