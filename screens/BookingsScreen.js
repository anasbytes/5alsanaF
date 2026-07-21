import React, { useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../utils/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { LanguageContext } from '../utils/LanguageContext';

export default function BookingsScreen({ navigation }) {
    const { signOut } = useContext(AuthContext);
    const { t, language, formatNumber } = useContext(LanguageContext);

    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            fetchBookings();
        }, [])
    );

    const formatTo12Hour = (timeStr) => {
        if (!timeStr) return '';
        let [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const formattedHour = hour % 12 || 12;
        return `${formattedHour}:${m} ${ampm}`;
    };

    const fetchBookings = async () => {
        try {
            const token = await SecureStore.getItemAsync('token');

            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/bookings/player/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'ngrok-skip-browser-warning': 'true'
                }
            });

            if (response.status === 401 || response.status === 403) {
                await signOut();
                return;
            }

            const data = await response.json();

            if (response.ok) {
                const sorted = data.sort((a, b) => {
                    const statusA = getDisplayStatus(a).rawText;
                    const statusB = getDisplayStatus(b).rawText;

                    const priority = { 'ACTIVE': 0, 'PENDING': 1, 'CONFIRMED': 2, 'COMPLETED': 3, 'CANCELLED': 4 };
                    const pA = priority[statusA] ?? 5;
                    const pB = priority[statusB] ?? 5;

                    if (pA !== pB) return pA - pB;

                    return new Date(b.booking_date) - new Date(a.booking_date);
                });

                setBookings(sorted);
            }
        } catch (error) {
            console.error("Network Error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchBookings();
    };

    const getDisplayStatus = (item) => {
        const statusStr = item.status.toLowerCase();

        if (statusStr === 'cancelled') {
            return { rawText: 'CANCELLED', text: t('cancelled') || 'CANCELLED', style: styles.statusCancelled, icon: 'close-circle' };
        }

        if (statusStr === 'pending') {
            return { rawText: 'PENDING', text: t('pending') || 'PENDING', style: styles.statusPending, icon: 'time' };
        }

        const now = new Date();
        const d = new Date(item.booking_date);

        const [startH, startM] = item.start_time.split(':');
        const [endH, endM] = item.end_time.split(':');

        const startObj = new Date(d.getFullYear(), d.getMonth(), d.getDate(), parseInt(startH), parseInt(startM));
        const endObj = new Date(d.getFullYear(), d.getMonth(), d.getDate(), parseInt(endH), parseInt(endM));

        if (parseInt(endH) < parseInt(startH)) {
            endObj.setDate(endObj.getDate() + 1);
        }

        if (now >= startObj && now <= endObj) {
            return { rawText: 'ACTIVE', text: t('active') || 'ACTIVE', style: styles.statusActive, icon: 'play-circle' };
        } else if (now > endObj) {
            return { rawText: 'COMPLETED', text: t('completed') || 'COMPLETED', style: styles.statusCompleted, icon: 'checkmark-done-circle' };
        } else {
            return { rawText: 'CONFIRMED', text: t('confirmed') || 'CONFIRMED', style: styles.statusConfirmed, icon: 'checkmark-circle' };
        }
    };

    const handleBookingPress = (item) => {
        const mappedFacility = {
            id: item.facility_id,
            name: item.facility_name,
            type: item.facility_type,
            location: item.facility_location,
            image_url: item.image_url,
            price_per_hour: item.price_per_hour
        };

        navigation.navigate('FacilityDetails', {
            facility: mappedFacility,
            booking: item
        });
    };

    const renderBooking = ({ item }) => {
        const start = formatTo12Hour(item.start_time);
        const end = formatTo12Hour(item.end_time);

        const locale = language === 'ar' ? 'ar-EG' : 'en-GB';
        const date = new Date(item.booking_date).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });

        const statusConfig = getDisplayStatus(item);
        const isCompleted = statusConfig.rawText === 'COMPLETED';

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => handleBookingPress(item)}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.facility_name}</Text>
                    <View style={[styles.statusBadge, statusConfig.style]}>
                        <Ionicons name={statusConfig.icon} size={14} color={statusConfig.style.color} />
                        <Text style={[styles.statusText, { color: statusConfig.style.color }]}>{statusConfig.text}</Text>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{t(item.facility_type.toLowerCase()) || item.facility_type.toUpperCase()}</Text>
                    </View>
                    <View style={styles.locationContainer}>
                        <Ionicons name="location" size={14} color="#888" />
                        <Text style={styles.cardLocation} numberOfLines={1}>{item.facility_location}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.timeRow}>
                    <View style={styles.timeColumn}>
                        <Text style={styles.timeLabel}>{t('date') || 'Date'}</Text>
                        <View style={styles.timeValRow}>
                            <Ionicons name="calendar-outline" size={16} color="#13294B" />
                            <Text style={styles.timeValue}>{date}</Text>
                        </View>
                    </View>
                    <View style={styles.timeColumn}>
                        <Text style={styles.timeLabel}>{t('time') || 'Time'}</Text>
                        <View style={styles.timeValRow}>
                            <Ionicons name="time-outline" size={16} color="#13294B" />
                            <Text style={[styles.timeValue, { direction: 'ltr' }]}>{start} - {end}</Text>
                        </View>
                    </View>
                </View>

                {isCompleted && (
                    <TouchableOpacity
                        style={styles.ratePrompt}
                        onPress={() => navigation.navigate('BookingReceipt', {
                            booking: { ...item, derivedStatus: 'completed' }
                        })}
                    >
                        <View style={styles.rateStars}>
                            {[1, 2, 3, 4, 5].map(s => (
                                <Ionicons key={s} name="star-outline" size={16} color="#F59E0B" />
                            ))}
                        </View>
                        <Text style={styles.ratePromptText}>{t('rate_experience') || 'Rate your experience'}</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={styles.receiptButton}
                    onPress={() => navigation.navigate('BookingReceipt', {
                        booking: { ...item, derivedStatus: isCompleted ? 'completed' : item.status }
                    })}
                >
                    <Ionicons name="receipt-outline" size={14} color="#E8751A" />
                    <Text style={styles.receiptButtonText}>{t('view_receipt') || 'View Receipt'}</Text>
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('my_bookings') || 'My Bookings'}</Text>
                <Text style={styles.headerSubText}>{t('track_bookings') || 'Track your requests and sessions'}</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#E8751A" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={bookings}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderBooking}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8751A" />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="calendar-clear-outline" size={60} color="#D0D0D0" />
                            <Text style={styles.emptyText}>{t('no_bookings_yet') || "You haven't booked anything yet."}</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

// 🌐 Removed ALL hardcoded textAlign: 'left' from the StyleSheet!
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F9F6F0' },
    header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
    headerTitle: { fontSize: 26, fontWeight: '900', color: '#13294B', letterSpacing: -0.5 },
    headerSubText: { fontSize: 14, color: '#888888', marginTop: 4, fontWeight: '600' },
    listContainer: { paddingHorizontal: 20, paddingBottom: 30 },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#D4D0C8',
        padding: 18,
        marginBottom: 16,
        shadowColor: '#13294B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    cardTitle: { fontSize: 18, fontWeight: '800', color: '#13294B', flex: 1, marginEnd: 10, letterSpacing: 0.2 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 4 },
    statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    statusPending: { backgroundColor: '#FFF3E8', color: '#E8751A' },
    statusConfirmed: { backgroundColor: '#E3F2FD', color: '#2E7D32' },
    statusActive: { backgroundColor: '#E8F5E9', color: '#1565C0' },
    statusCompleted: { backgroundColor: '#F5F5F5', color: '#757575' },
    statusCancelled: { backgroundColor: '#FFEBEE', color: '#D32F2F' },
    cardBody: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    badge: { backgroundColor: '#13294B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5, textAlign: 'center' },
    locationContainer: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginStart: 10 },
    cardLocation: { fontSize: 13, color: '#555555', marginStart: 4, flexShrink: 1, fontWeight: '600' },
    divider: { height: 1, backgroundColor: '#EAE6DF', marginVertical: 12 },
    timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
    timeColumn: { flex: 1, alignItems: 'flex-start' },
    timeLabel: { fontSize: 11, color: '#888888', fontWeight: '800', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    timeValRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    timeValue: { fontSize: 14, fontWeight: '800', color: '#13294B' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
    emptyText: { fontSize: 16, fontWeight: '800', color: '#888888', marginTop: 15, textAlign: 'center' },
    receiptButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E8751A', gap: 6 },
    receiptButtonText: { fontSize: 13, color: '#E8751A', fontWeight: '600' },
    ratePrompt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: '#FEF3C7', gap: 8 },
    rateStars: { flexDirection: 'row', gap: 2 },
    ratePromptText: { fontSize: 13, color: '#92400E', fontWeight: '600' },
});