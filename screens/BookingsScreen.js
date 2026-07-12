import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function BookingsScreen({ navigation }) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchBookings();
        });
        return unsubscribe;
    }, [navigation]);

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
            const token = await AsyncStorage.getItem('token');
            const userId = await AsyncStorage.getItem('user_id');

            if (!userId) return;

            const response = await fetch(`https://freeway-chest-calzone.ngrok-free.dev/bookings/user/${userId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'ngrok-skip-browser-warning': 'true'
                }
            });

            const data = await response.json();
            
            if (response.ok) {
                const sorted = data.sort((a, b) => {
                    const statusA = getDisplayStatus(a).text;
                    const statusB = getDisplayStatus(b).text;
                    
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
            return { text: 'CANCELLED', style: styles.statusCancelled, icon: 'close-circle' };
        }
        
        if (statusStr === 'pending') {
            return { text: 'PENDING', style: styles.statusPending, icon: 'time' };
        }

        const now = new Date();
        const d = new Date(item.booking_date);
        
        const [startH, startM] = item.start_time.split(':');
        const [endH, endM] = item.end_time.split(':');
        
        const startObj = new Date(d.getFullYear(), d.getMonth(), d.getDate(), parseInt(startH), parseInt(startM));
        const endObj = new Date(d.getFullYear(), d.getMonth(), d.getDate(), parseInt(endH), parseInt(endM));

        if (now >= startObj && now <= endObj) {
            return { text: 'ACTIVE', style: styles.statusActive, icon: 'play-circle' };
        } else if (now > endObj) {
            return { text: 'COMPLETED', style: styles.statusCompleted, icon: 'checkmark-done-circle' };
        } else {
            return { text: 'CONFIRMED', style: styles.statusConfirmed, icon: 'checkmark-circle' };
        }
    };

    const handleBookingPress = (item) => {
        const statusConfig = getDisplayStatus(item);
        
        const mappedFacility = {
            id: item.facility_id,
            name: item.facility_name,
            type: item.facility_type,
            location: item.facility_location,
            image_url: item.image_url, 
            price_per_hour: item.price_per_hour
        };

        navigation.navigate('Home', { 
            screen: 'FacilityDetails',
            initial: false,
            params: {
                facility: mappedFacility, 
                booking: item,
                bookingStatus: statusConfig.text 
            }
        });
    };

    const renderBooking = ({ item }) => {
        const start = formatTo12Hour(item.start_time);
        const end = formatTo12Hour(item.end_time);
        const date = new Date(item.booking_date).toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
        
        const statusConfig = getDisplayStatus(item);

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
                        <Text style={styles.badgeText}>{item.facility_type.toUpperCase()}</Text>
                    </View>
                    <View style={styles.locationContainer}>
                        <Ionicons name="location" size={14} color="#888" />
                        <Text style={styles.cardLocation} numberOfLines={1}>{item.facility_location}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.timeRow}>
                    <View style={styles.timeColumn}>
                        <Text style={styles.timeLabel}>Date</Text>
                        <View style={styles.timeValRow}>
                            <Ionicons name="calendar-outline" size={16} color="#13294B" />
                            <Text style={styles.timeValue}>{date}</Text>
                        </View>
                    </View>
                    <View style={styles.timeColumn}>
                        <Text style={styles.timeLabel}>Time</Text>
                        <View style={styles.timeValRow}>
                            <Ionicons name="time-outline" size={16} color="#13294B" />
                            <Text style={styles.timeValue}>{start} - {end}</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Bookings</Text>
                <Text style={styles.headerSubText}>Track your requests and sessions</Text>
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
                            <Text style={styles.emptyText}>You haven't booked anything yet.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

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
    cardTitle: { fontSize: 18, fontWeight: '800', color: '#13294B', flex: 1, marginRight: 10, letterSpacing: 0.2 },
    
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 4 },
    statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    statusPending: { backgroundColor: '#FFF3E8', color: '#E8751A' },
    statusConfirmed: { backgroundColor: '#E3F2FD', color: '#2E7D32' },
    statusActive: { backgroundColor: '#E8F5E9', color: '#1565C0' },
    statusCompleted: { backgroundColor: '#F5F5F5', color: '#757575' },
    statusCancelled: { backgroundColor: '#FFEBEE', color: '#D32F2F' },
    
    cardBody: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    badge: { backgroundColor: '#13294B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
    locationContainer: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginLeft: 10 },
    cardLocation: { fontSize: 13, color: '#555555', marginLeft: 4, flexShrink: 1, fontWeight: '600' }, 
    
    divider: { height: 1, backgroundColor: '#EAE6DF', marginVertical: 12 }, 
    
    timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
    timeColumn: { flex: 1 },
    timeLabel: { fontSize: 11, color: '#888888', fontWeight: '800', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }, 
    timeValRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    timeValue: { fontSize: 14, fontWeight: '800', color: '#13294B' }, 
    
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
    emptyText: { fontSize: 16, fontWeight: '800', color: '#888888', marginTop: 15 },
});