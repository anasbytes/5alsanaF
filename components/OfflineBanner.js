import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { LanguageContext } from '../utils/LanguageContext';

export default function OfflineBanner() {
    const { t } = useContext(LanguageContext) || {};
    const [isConnected, setIsConnected] = useState(true);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            // state.isConnected can be null initially, so we default to true to avoid flashing
            setIsConnected(state.isConnected !== false); 
        });
        return () => unsubscribe();
    }, []);

    if (isConnected) return null;

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.banner}>
                <Ionicons name="cloud-offline" size={18} color="#FFFFFF" style={{ marginEnd: 8 }} />
                <Text style={styles.text}>{t ? t('no_internet') : 'No Internet Connection'}</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: '#D32F2F',
        paddingTop: Platform.OS === 'android' ? 25 : 0, 
    },
    banner: {
        backgroundColor: '#D32F2F',
        paddingVertical: 10,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    text: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    }
});