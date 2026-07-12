import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = 'https://freeway-chest-calzone.ngrok-free.dev';

export default function HostBookingsScreen({ navigation }) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchHostBookings = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const userId = await AsyncStorage.getItem('user_id');
            
            const response = await fetch(`${BACKEND_URL}/bookings/host/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
            });
            
            const data = await response.json();
            if (response.ok) {
                const sorted = data.sort((a, b) => {
                    const statusPriority = { 'pending': 0, 'confirmed': 1, 'completed': 2, 'cancelled': 3 };
                    const pA = statusPriority[a.status.toLowerCase()] ?? 4;
                    const pB = statusPriority[b.status.toLowerCase()] ?? 4;
                    if (pA !== pB) return pA - pB;
                    return new Date(b.booking_date) - new Date(a.booking_date);
                });
                setBookings(sorted);
            }
        } catch (error) {
            console.error('Error fetching host bookings:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchHostBookings();
        });
        return unsubscribe;
    }, [navigation, fetchHostBookings]);

    const updateBookingStatus = async (bookingId, newStatus) => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/bookings/${bookingId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                fetchHostBookings();
            } else {
                const data = await response.json();
                Alert.alert('Error', data.error || 'Failed to update booking status.');
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const confirmAction = (booking, action) => {
        const title = action === 'confirmed' ? 'Accept Booking' : 'Decline Booking';
        const message = `Are you sure you want to ${action === 'confirmed' ? 'accept' : 'decline'} this booking for ${booking.facility_name}?`;
        
        Alert.alert(title, message, [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: action === 'confirmed' ? 'Accept' : 'Decline', 
                style: action === 'confirmed' ? 'default' : 'destructive',
                onPress: () => updateBookingStatus(booking.id, action) 
            }
        ]);
    };

    const getStatusStyle = (status) => {
        switch (status.toLowerCase()) {
            case 'confirmed': return { color: '#2E8B57', bg: '#E8F5E9', icon: 'checkmark-circle', text: 'CONFIRMED' };
            case 'cancelled': return { color: '#D32F2F', bg: '#FFEBEE', icon: 'close-circle', text: 'CANCELLED' };
            case 'completed': return { color: '#888888', bg: '#F5F5F5', icon: 'checkmark-done-circle', text: 'COMPLETED' };
            default: return { color: '#E8751A', bg: '#FFF3E8', icon: 'time', text: 'PENDING' };
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
        const dateObj = new Date(item.booking_date);
        const formattedDate = dateObj.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
        
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
                        <Text style={styles.infoText}>Player: <Text style={styles.boldText}>{item.player_name}</Text></Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={16} color="#888" />
                        <Text style={styles.infoText}>{formattedDate}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="time-outline" size={16} color="#888" />
                        <Text style={styles.infoText}>{formatTo12Hour(item.start_time)} - {formatTo12Hour(item.end_time)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="cash-outline" size={16} color="#888" />
                        <Text style={styles.infoText}>Total: <Text style={styles.priceText}>{item.total_price} EGP</Text></Text>
                    </View>
                </View>

                {item.status.toLowerCase() === 'pending' && (
                    <>
                        <View style={styles.divider} />
                        <View style={styles.actionsContainer}>
                            <TouchableOpacity style={styles.declineBtn} onPress={() => confirmAction(item, 'cancelled')}>
                                <Text style={styles.declineBtnText}>Decline</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.acceptBtn} onPress={() => confirmAction(item, 'confirmed')}>
                                <Text style={styles.acceptBtnText}>Accept Booking</Text>
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
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="calendar-clear-outline" size={60} color="#D0D0D0" />
                            <Text style={styles.emptyText}>No incoming requests.</Text>
                            <Text style={styles.emptySubText}>Bookings will appear here.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9F6F0' },
    listContainer: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 30 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: '#D4D0C8', shadowColor: '#13294B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    facilityName: { fontSize: 18, fontWeight: '800', color: '#13294B', flex: 1, marginRight: 10, letterSpacing: 0.2 },
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
    acceptBtn: { flex: 2, paddingVertical: 12, borderRadius: 10, backgroundColor: '#E8751A', alignItems: 'center', borderWidth: 1, borderColor: '#E8751A' },
    acceptBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
    emptyText: { fontSize: 18, fontWeight: '800', color: '#13294B', marginTop: 15 },
    emptySubText: { fontSize: 14, color: '#888888', marginTop: 5, fontWeight: '600' },
});