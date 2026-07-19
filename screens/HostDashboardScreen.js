import React, { useContext } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

// Import your two host screens
import MyFacilitiesScreen from './MyFacilitiesScreen';
import HostBookingsScreen from './HostBookingsScreen';

// 🌐 Import Language Context
import { LanguageContext } from '../utils/LanguageContext';

const TopTab = createMaterialTopTabNavigator();

export default function HostDashboardScreen() {
    // 🌐 Use Language Context
    const { t } = useContext(LanguageContext);

    return (
        <SafeAreaView style={styles.safeArea}>
            <TopTab.Navigator
                screenOptions={{
                    tabBarLabelStyle: { fontSize: 14, fontWeight: '800', textTransform: 'none', letterSpacing: 0.2 },
                    tabBarActiveTintColor: '#E8751A',
                    tabBarInactiveTintColor: '#888888',
                    tabBarIndicatorStyle: { backgroundColor: '#E8751A', height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
                    tabBarStyle: { backgroundColor: '#F9F6F0', elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#D4D0C8' },
                }}
            >
                <TopTab.Screen 
                    name="FacilitiesList" 
                    component={MyFacilitiesScreen} 
                    options={{ tabBarLabel: t('my_facilities') || 'My Facilities' }} 
                />
                <TopTab.Screen 
                    name="HostRequests" 
                    component={HostBookingsScreen} 
                    options={{ tabBarLabel: t('requests') || 'Requests' }} 
                />
            </TopTab.Navigator>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F9F6F0' },
});