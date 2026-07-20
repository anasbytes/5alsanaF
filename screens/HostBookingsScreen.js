import React, { useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity, RefreshControl } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../utils/AuthContext';
// 🌐 Import Language Context
import { LanguageContext } from '../utils/LanguageContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL;

export default function HostBookingsScreen({ navigation }) {
    const { signOut } = useContext(AuthContext);
    // 🌐 Use Language Context
    const { t, language, formatNumber } = useContext(LanguageContext);

    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [updatingId, setUpdatingId] = useState(null);

    const fetchHostBookings = useCallback(async () => {
        try {
            const token = await SecureStore.getItemAsync('token');

            const response = await fetch(`${BACKEND_URL}/bookings/host/me`, {
                headers: { 'Authorization': `Bearer ${token}`,
                 'ngrok-skip-browser-warning': 'true' }
            });

            if (response.status === 401 || response.status === 403) {
                await signOut();
                return;
            }

            const data = await response.json();
            if (response.ok) {
                const sorted = data.sort((a, b) => {
                    const statusPriority = { 'pending': 0, 'confirmed': 1, 'completed': 2, 'cancelled': 3 };
                    const pA = statusPriority[a.status.toLowerCase()] ?? 4;
                    const pB = statusPriority[b.status.toLowerCase()] ?? 4;

                    if (pA !== pB) return pA - pB;

                    const dateA = new Date(a.booking_date);
                    const dateB = new Date(b.booking_date);
                    if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;

                    return a.start_time.localeCompare(b.start_time);
                });
                setBookings(sorted);
            }
        } catch (error) {
            console.error('Error fetching host bookings:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [signOut]);

    React.useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchHostBookings();
        });
        return unsubscribe;
    }, [navigation, fetchHostBookings]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchHostBookings();
    };

    const updateBookingStatus = async (bookingId, newStatus) => {
        setUpdatingId(bookingId);
        try {
            const token = await SecureStore.getItemAsync('token');
            const response = await fetch(`${BACKEND_URL}/bookings/${bookingId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.status === 401 || response.status === 403) {
                await signOut();
                return;
            }

            if (response.ok) {
                fetchHostBookings();
            } else {
                const data = await response.json();
                Alert.alert(t('error') || 'Error', data.error || t('update_failed') || 'Failed to update booking status.');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            Alert.alert(t('network_error') || 'Network Error', t('check_connection') || 'Please check your connection and try again.');
        } finally {
            setUpdatingId(null);
        }
    };

    const confirmAction = (booking, action) => {
        const isAccepting = action === 'confirmed';
        const title = isAccepting ? (t('accept_booking') || 'Accept Booking') : (t('decline_booking') || 'Decline Booking');

        const messageActionText = isAccepting ? (t('confirm_accept') || 'accept') : (t('confirm_decline') || 'decline');
        const message = `${t('are_you_sure') || 'Are you sure you want to'} ${messageActionText} ${t('booking_for') || 'this booking for'} ${booking.facility_name}?`;

        Alert.alert(title, message, [
            { text: t('cancel') || 'Cancel', style: 'cancel' },
            {
                text: isAccepting ? (t('accept') || 'Accept') : (t('decline') || 'Decline'),
                style: isAccepting ? 'default' : 'destructive',
                onPress: () => updateBookingStatus(booking.id, action)
            }
        ]);
    };

    const getStatusStyle = (status) => {
        switch (status.toLowerCase()) {
            case 'confirmed': return { color: '#2E8B57', bg: '#E8F5E9', icon: 'checkmark-circle', text: t('confirmed') || 'CONFIRMED' };
            case 'cancelled': return { color: '#D32F2F', bg: '#FFEBEE', icon: 'close-circle', text: t('cancelled') || 'CANCELLED' };
            case 'completed': return { color: '#888888', bg: '#F5F5F5', icon: 'checkmark-done-circle', text: t('completed') || 'COMPLETED' };
            default: return { color: '#E8751A', bg: '#FFF3E8', icon: 'time', text: t('pending') || 'PENDING' };
        }
    };

    const formatTo12Hour = (timeStr) => {
        if (!timeStr) return '';
        let [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const formattedHour = hour % 12 || 12;
        return `${formattedHour}:${m} ${ampm}`;
    };

    const renderBooking = ({ item }) => {
        const statusStyle = getStatusStyle(item.status);
        const locale = language === 'ar' ? 'ar-EG' : 'en-GB';
        const dateObj = new Date(item.booking_date);
        const formattedDate = dateObj.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });

        const isCurrentlyUpdating = updatingId === item.id;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.facilityName} numberOfLines={1}>{item.facility_name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Ionicons name={statusStyle.icon} size={14} color={statusStyle.color} />
                        <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.text}</Text>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <Ionicons name="person-outline" size={16} color="#888" />
                        <Text style={styles.infoText}>{t('player_label') || 'Player:'} <Text style={styles.boldText}>{item.player_name}</Text></Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={16} color="#888" />
                        <Text style={styles.infoText}>{formattedDate}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="time-outline" size={16} color="#888" />
                        {/* 🌐 Forced LTR so time formatting doesn't break in Arabic */}
                        <Text style={[styles.infoText, { direction: 'ltr' }]}>{formatTo12Hour(item.start_time)} - {formatTo12Hour(item.end_time)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="cash-outline" size={16} color="#888" />
                        <Text style={styles.infoText}>
                            {t('total_label') || 'Total:'} <Text style={styles.priceText}>
                                {parseFloat(item.total_price).toFixed(2).replace(/\.00$/, '')} {t('egp') || 'EGP'}
                            </Text>
                        </Text>
                    </View>
                </View>

                {item.status.toLowerCase() === 'pending' && (
                    <>
                        <View style={styles.divider} />
                        <View style={styles.actionsContainer}>
                            <TouchableOpacity
                                style={[styles.declineBtn, isCurrentlyUpdating && { opacity: 0.5 }]}
                                onPress={() => confirmAction(item, 'cancelled')}
                                disabled={isCurrentlyUpdating}
                            >
                                <Text style={styles.declineBtnText}>{t('decline') || 'Decline'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.acceptBtn, isCurrentlyUpdating && { opacity: 0.5 }]}
                                onPress={() => confirmAction(item, 'confirmed')}
                                disabled={isCurrentlyUpdating}
                            >
                                {isCurrentlyUpdating ? (
                                    <ActivityIndicator size="small" color="#13294B" />
                                ) : (
                                    <Text style={styles.acceptBtnText}>{t('accept_booking') || 'Accept Booking'}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {loading ? (
                <ActivityIndicator size="large" color="#E8751A" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={bookings}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderBooking}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8751A" />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="calendar-clear-outline" size={60} color="#D0D0D0" />
                            <Text style={styles.emptyText}>{t('no_requests') || 'No incoming requests.'}</Text>
                            <Text style={styles.emptySubText}>{t('requests_appear_here') || 'Bookings will appear here.'}</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

// 🌐 Removed ALL hardcoded textAlign: 'left' from the StyleSheet!
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9F6F0' },
    listContainer: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 30 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: '#D4D0C8', shadowColor: '#13294B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    facilityName: { fontSize: 18, fontWeight: '800', color: '#13294B', flex: 1, marginEnd: 10, letterSpacing: 0.2 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 4 },
    statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    cardBody: { gap: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoText: { fontSize: 14, color: '#555555', fontWeight: '600' },
    boldText: { fontWeight: '800', color: '#13294B' },
    priceText: { fontWeight: '900', color: '#E8751A' },
    divider: { height: 1, backgroundColor: '#EAE6DF', marginVertical: 15 },
    actionsContainer: { flexDirection: 'row', gap: 10 },
    declineBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D32F2F', alignItems: 'center' },
    declineBtnText: { color: '#D32F2F', fontWeight: '800', fontSize: 14 },
    acceptBtn: { flex: 2, paddingVertical: 12, borderRadius: 10, backgroundColor: '#E3F2FD', alignItems: 'center', borderWidth: 1, borderColor: '#000000' },
    acceptBtnText: { color: '#13294B', fontWeight: '900', fontSize: 14 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
    emptyText: { fontSize: 18, fontWeight: '800', color: '#13294B', marginTop: 15, textAlign: 'center' },
    emptySubText: { fontSize: 14, color: '#888888', marginTop: 5, fontWeight: '600', textAlign: 'center' },
});