import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, Modal, Animated, ScrollView, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons'; 

export default function FacilityDetailsScreen({ route, navigation }) {
    const { facility, booking, onGoBack } = route.params; // NEW: Extracted onGoBack

    const deriveStatus = (b) => {
        if (!b) return null;
        if (b.status === 'cancelled') return 'CANCELLED';
        if (b.status === 'completed') return 'COMPLETED';
        if (b.status === 'pending') return 'PENDING';
        return 'CONFIRMED';
    };

    const [currentBookingStatus, setCurrentBookingStatus] = useState(deriveStatus(booking));
    const [isBusy, setIsBusy] = useState(false);
    const [facilityBookings, setFacilityBookings] = useState([]);
    
    // NEW: Loading states for network requests
    const [isSubmitting, setIsSubmitting] = useState(false); 

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [bookingStep, setBookingStep] = useState('calendar'); 
    const [selectedDate, setSelectedDate] = useState('');
    
    const [startTime, setStartTime] = useState(null);
    const [endTime, setEndTime] = useState(null);
    const [selectionMode, setSelectionMode] = useState('start'); 

    const fadeAnim = useRef(new Animated.Value(1)).current;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const timeSlots = [
        '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', 
        '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', 
        '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', 
        '08:00 PM', '09:00 PM', '10:00 PM', '11:00 PM'
    ];

    const formatTimeTo24Hour = (timeStr) => {
        if (!timeStr) return null;
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        
        if (hours === '12') hours = '00';
        if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
        
        return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
    };

    useEffect(() => {
        if (!booking) {
            fetchFacilityAvailability();
        }
    }, []);

    const fetchFacilityAvailability = async () => {
        try {
            const token = await AsyncStorage.getItem('token'); 
            const response = await fetch(`https://freeway-chest-calzone.ngrok-free.dev/bookings/facility/${facility.id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            const bookings = await response.json();

            if (response.ok) {
                setFacilityBookings(bookings);

                const currentNow = new Date();
                const bookedTimesToday = bookings.filter(b => {
                    if (!b.booking_date) return false;
                    const bDate = new Date(b.booking_date).toISOString().split('T')[0];
                    return bDate === todayStr && b.status !== 'cancelled';
                });

                let hasAvailableSlot = false;

                for (let time of timeSlots) {
                    const time24 = formatTimeTo24Hour(time);
                    const [h, m] = time24.split(':');
                    
                    const slotDate = new Date();
                    slotDate.setHours(parseInt(h), parseInt(m), 0, 0);
                    
                    if (slotDate > currentNow) {
                        const isBooked = bookedTimesToday.some(b => time24 >= b.start_time && time24 < b.end_time);
                        if (!isBooked) {
                            hasAvailableSlot = true; 
                            break;
                        }
                    }
                }
                setIsBusy(!hasAvailableSlot);
            }
        } catch (error) {
            console.error("Error checking availability:", error);
        }
    };

    const triggerFadeTransition = (nextStep) => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setBookingStep(nextStep);
            if (nextStep === 'calendar') {
                setStartTime(null);
                setEndTime(null);
                setSelectionMode('start');
            }
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 250, 
                useNativeDriver: true,
            }).start();
        });
    };

    const handleTimeSelect = (time) => {
        if (selectionMode === 'start') {
            setStartTime(time);
            setSelectionMode('end'); 
            
            const newStartIndex = timeSlots.indexOf(time);
            if (endTime && timeSlots.indexOf(endTime) <= newStartIndex) {
                setEndTime(null);
            }
        } else {
            setEndTime(time);
        }
    };

    const getDisplayedTimeSlots = () => {
        const bookedTimesOnDate = facilityBookings.filter(b => {
            const bDate = new Date(b.booking_date).toISOString().split('T')[0];
            return bDate === selectedDate && b.status !== 'cancelled';
        });

        let availableSlots = timeSlots;

        // If today, filter out past times
        if (selectedDate === todayStr) {
            const currentTime = new Date();
            availableSlots = availableSlots.filter(time => {
                const time24 = formatTimeTo24Hour(time);
                const [h, m] = time24.split(':');
                const slotDate = new Date();
                slotDate.setHours(parseInt(h), parseInt(m), 0, 0);
                return slotDate > currentTime; 
            });
        }

        if (selectionMode === 'start') {
            // For Start Time, just filter out explicitly booked slots
            return availableSlots.filter(time => {
                const time24 = formatTimeTo24Hour(time);
                return !bookedTimesOnDate.some(b => time24 >= b.start_time && time24 < b.end_time);
            });
        } else {
            // BUG FIX: The Swiss Cheese Logic Fix
            // For End Time, they must select a time AFTER start time, 
            // AND the duration cannot overlap an existing booking.
            if (!startTime) return [];
            
            const startIndex = availableSlots.indexOf(startTime);
            if (startIndex === -1) return [];

            const start24 = formatTimeTo24Hour(startTime);
            const possibleEndTimes = availableSlots.slice(startIndex + 1);

            return possibleEndTimes.filter(endTimeCandidate => {
                const end24 = formatTimeTo24Hour(endTimeCandidate);
                // Check if any booking falls entirely or partially inside this duration
                const hasOverlap = bookedTimesOnDate.some(b => {
                    return (b.start_time < end24 && b.end_time > start24);
                });
                return !hasOverlap;
            });
        }
    };

    const displayedTimeSlots = getDisplayedTimeSlots();

    const formatTo12Hour = (timeStr) => {
        if (!timeStr) return '';
        let [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const formattedHour = hour % 12 || 12;
        return `${formattedHour}:${m} ${ampm}`;
    };

    const handleBooking = async () => {
        setIsSubmitting(true); // Lock the button
        try {
            const token = await AsyncStorage.getItem('token');
            const dbStartTime = formatTimeTo24Hour(startTime);
            const dbEndTime = formatTimeTo24Hour(endTime);

            const response = await fetch(`https://freeway-chest-calzone.ngrok-free.dev/bookings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true' 
                },
                body: JSON.stringify({
                    facility_id: facility.id,
                    booking_date: selectedDate,
                    start_time: dbStartTime,
                    end_time: dbEndTime,
                    status: 'pending' 
                })
            });

            if (response.ok) {
                alert('Request Sent! Waiting for host approval.');
                setIsModalVisible(false); 
                fetchFacilityAvailability(); 
                onGoBack?.(); // NEW: Refresh previous screen
            } else {
                const data = await response.json();
                alert('Failed to book: ' + JSON.stringify(data.errors || data.error));
            }
        } catch (error) {
            console.error("Booking error:", error);
            alert('Something went wrong connecting to the server.');
        } finally {
            setIsSubmitting(false); // Unlock the button
        }
    };

    const handleCancelPress = () => {
        Alert.alert(
            "Cancel Request",
            `Are you sure you want to cancel your request for ${facility.name}?`,
            [
                { text: "No, keep it", style: "cancel" },
                { text: "Yes, cancel it", style: "destructive", onPress: confirmCancellation }
            ]
        );
    };

    const confirmCancellation = async () => {
        setIsSubmitting(true); // Lock the button
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`https://freeway-chest-calzone.ngrok-free.dev/bookings/${booking.id}/cancel`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'ngrok-skip-browser-warning': 'true'
                }
            });

            if (response.ok) {
                setCurrentBookingStatus('CANCELLED');
                onGoBack?.(); // NEW: Tell previous screen to refresh!
                Alert.alert("Success", "Your request has been cancelled.");
            } else {
                Alert.alert("Error", "Failed to cancel. Please try again.");
            }
        } catch (error) {
            console.error("Cancellation Error:", error);
        } finally {
            setIsSubmitting(false); // Unlock the button
        }
    };

    const isCancelledOrCompleted = currentBookingStatus === 'CANCELLED' || currentBookingStatus === 'COMPLETED';

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                
                <View style={styles.paddedBlock}>
                    <View style={styles.headerRow}>
                        <Text style={styles.title} numberOfLines={2}>{facility.name}</Text>
                        
                        {!booking ? (
                            <View style={[styles.statusBadge, isBusy ? styles.statusBusy : styles.statusFree]}>
                                <Text style={styles.statusText}>{isBusy ? 'BUSY' : 'AVAILABLE'}</Text>
                            </View>
                        ) : (
                            <View style={[styles.statusBadge, currentBookingStatus === 'CANCELLED' ? styles.statusCancelled : currentBookingStatus === 'COMPLETED' ? styles.statusCompleted : currentBookingStatus === 'PENDING' ? styles.statusPending : styles.statusFree]}>
                                <Text style={styles.statusText}>{currentBookingStatus}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{facility.type.toUpperCase()}</Text>
                    </View>
                </View>

                <View style={styles.imageContainer}>
                    <Image source={{ uri: facility.image_url || 'https://via.placeholder.com/400x200.png?text=No+Image' }} style={styles.facilityImage} />
                </View>

                <View style={styles.bottomGroup}>
                    <View style={styles.infoBox}>
                        <View style={styles.infoRow}>
                            <Ionicons name="location" size={16} color="#888" />
                            <Text style={styles.infoText}>{facility.location}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Ionicons name="cash-outline" size={16} color="#888" />
                            <Text style={styles.infoText}><Text style={styles.priceHighlight}>{facility.price_per_hour || '--'}</Text> EGP / hr</Text>
                        </View>
                        
                        {booking && (
                            <View style={styles.bookingDetails}>
                                <View style={styles.divider} />
                                <View style={styles.infoRow}>
                                    <Ionicons name="calendar-outline" size={16} color="#13294B" />
                                    <Text style={styles.infoTextValue}>{new Date(booking.booking_date).toLocaleDateString('en-GB', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Ionicons name="time-outline" size={16} color="#13294B" />
                                    <Text style={styles.infoTextValue}>{formatTo12Hour(booking.start_time)} - {formatTo12Hour(booking.end_time)}</Text>
                                </View>
                            </View>
                        )}
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={24} color="#13294B" />
                        </TouchableOpacity>

                        {booking ? (
                            <TouchableOpacity 
                                style={[
                                    styles.bookButton, 
                                    isCancelledOrCompleted ? styles.bookButtonDisabled : styles.cancelButtonActive
                                ]}
                                disabled={isCancelledOrCompleted || isSubmitting}
                                onPress={handleCancelPress}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.bookButtonText}>
                                        {currentBookingStatus === 'CANCELLED' ? 'Cancelled' : currentBookingStatus === 'COMPLETED' ? 'Completed' : 'Cancel Request'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity 
                                style={styles.bookButton}
                                onPress={() => {
                                    setBookingStep('calendar'); 
                                    setIsModalVisible(true);    
                                }}
                            >
                                <Text style={styles.bookButtonText}>Request to Book</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

            </View>

            <Modal animationType="slide" transparent={true} visible={isModalVisible} onRequestClose={() => setIsModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {bookingStep === 'calendar' ? 'Select Date' : 'Select Time'}
                            </Text>
                            <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#888" />
                            </TouchableOpacity>
                        </View>

                        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                            {bookingStep === 'calendar' ? (
                                <Calendar
                                    onDayPress={(day) => {
                                        setSelectedDate(day.dateString);
                                        setTimeout(() => { triggerFadeTransition('time'); }, 400);
                                    }}
                                    minDate={todayStr} 
                                    markedDates={{
                                        [selectedDate]: { selected: true, selectedColor: '#13294B', selectedTextColor: '#FFFFFF' }
                                    }}
                                    style={styles.calendarStyle}
                                    theme={{
                                        todayTextColor: '#E8751A', arrowColor: '#13294B',
                                        textDayFontSize: 16, textMonthFontSize: 18, textMonthFontWeight: '800', textDayHeaderFontSize: 13, 
                                        textDayFontWeight: '600',
                                        'stylesheet.calendar.main': {
                                            container: { paddingLeft: 0, paddingRight: 0 } 
                                        }
                                    }}
                                />
                            ) : (
                                <View style={styles.timeSelectionContainer}>
                                    <Text style={styles.selectedDateText}>{new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
                                    
                                    <View style={styles.toggleRow}>
                                        <TouchableOpacity 
                                            style={[styles.toggleButton, selectionMode === 'start' && styles.toggleActive]}
                                            onPress={() => setSelectionMode('start')}
                                        >
                                            <Text style={styles.toggleLabel}>Start Time</Text>
                                            <Text style={[styles.toggleValue, selectionMode === 'start' && styles.toggleValueActive]}>
                                                {startTime || '--:--'}
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity 
                                            style={[styles.toggleButton, selectionMode === 'end' && styles.toggleActive]}
                                            onPress={() => setSelectionMode('end')}
                                        >
                                            <Text style={styles.toggleLabel}>End Time</Text>
                                            <Text style={[styles.toggleValue, selectionMode === 'end' && styles.toggleValueActive]}>
                                                {endTime || '--:--'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    <ScrollView style={styles.gridScroll} contentContainerStyle={styles.gridContainer} showsVerticalScrollIndicator={false}>
                                        {displayedTimeSlots.length > 0 ? (
                                            displayedTimeSlots.map((time, index) => {
                                                const isSelected = (selectionMode === 'start' && startTime === time) || 
                                                                   (selectionMode === 'end' && endTime === time);
                                                return (
                                                    <TouchableOpacity 
                                                        key={index} 
                                                        style={[styles.gridSlot, isSelected && styles.gridSlotSelected]}
                                                        onPress={() => handleTimeSelect(time)}
                                                    >
                                                        <Text style={[styles.gridSlotText, isSelected && styles.gridSlotTextSelected]}>
                                                            {time}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })
                                        ) : (
                                            <Text style={styles.noTimesText}>No valid slots available based on selection.</Text>
                                        )}
                                    </ScrollView>

                                    <View style={styles.timeActionButtons}>
                                        <TouchableOpacity 
                                            style={styles.backToCalendarButtonSmall}
                                            onPress={() => triggerFadeTransition('calendar')}
                                        >
                                            <Text style={styles.backToCalendarTextSmall}>Back</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity 
                                            style={[
                                                styles.confirmBookingButton,
                                                (!startTime || !endTime) && styles.confirmBookingDisabled
                                            ]}
                                            disabled={!startTime || !endTime || isSubmitting}
                                            onPress={handleBooking}
                                        >
                                            {isSubmitting ? (
                                                <ActivityIndicator color="#FFF" />
                                            ) : (
                                                <Text style={styles.confirmBookingText}>Send Request</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>

                                </View>
                            )}
                        </Animated.View>

                    </View>
                </View>
            </Modal>
            
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F9F6F0' },
    container: { flex: 1, paddingTop: 40 },
    
    paddedBlock: { paddingHorizontal: 20, marginBottom: 15 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    title: { fontSize: 26, fontWeight: '900', color: '#13294B', flex: 1, letterSpacing: -0.5 },
    
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginLeft: 10, alignItems: 'center', justifyContent: 'center' },
    statusFree: { backgroundColor: '#2E8B57' },
    statusBusy: { backgroundColor: '#D32F2F' },
    statusPending: { backgroundColor: '#E8751A' },
    statusCancelled: { backgroundColor: '#D32F2F' },
    statusCompleted: { backgroundColor: '#888888' },
    statusText: { color: '#FFFFFF', fontWeight: '900', fontSize: 10, letterSpacing: 0.5 },
    
    badge: { alignSelf: 'flex-start', backgroundColor: '#13294B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    
    imageContainer: { paddingHorizontal: 20, marginBottom: 20 },
    facilityImage: { 
        width: '100%', height: 300, 
        borderRadius: 16, 
        borderWidth: 1, borderColor: '#13294B',
        resizeMode: 'cover',
    },
    
    bottomGroup: { flex: 1, paddingHorizontal: 20, paddingBottom: 30, justifyContent: 'space-between' },
    infoBox: { 
        backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, 
        borderWidth: 1, borderColor: '#13294B',
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
    infoText: { fontSize: 15, color: '#555555', fontWeight: '600', flexShrink: 1 },
    infoTextValue: { fontSize: 15, color: '#13294B', fontWeight: '800' },
    priceHighlight: { color: '#E8751A', fontWeight: '900', fontSize: 16 },
    
    bookingDetails: { marginTop: 5 },
    divider: { height: 1, backgroundColor: '#EAE6DF', marginVertical: 12 },
    
    buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, gap: 12 },
    backButton: { backgroundColor: '#FFFFFF', width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#13294B' },
    
    bookButton: { backgroundColor: '#E8751A', flex: 1, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E8751A' },
    bookButtonDisabled: { backgroundColor: '#D4D0C8', borderColor: '#D4D0C8' },
    cancelButtonActive: { backgroundColor: '#D32F2F', borderColor: '#D32F2F' },
    bookButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
    
    modalOverlay: { flex: 1, backgroundColor: 'rgba(19, 41, 75, 0.4)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 15, paddingTop: 25, paddingBottom: 30, height: '60%' }, 
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }, 
    modalTitle: { fontSize: 22, fontWeight: '900', color: '#13294B', letterSpacing: -0.5 },
    closeBtn: { padding: 4, backgroundColor: '#F5F5F5', borderRadius: 8 },
    
    calendarStyle: { marginTop: 5, transform: [{ scale: 1.03 }] }, 
    timeSelectionContainer: { flex: 1, paddingTop: 10 },
    
    selectedDateText: { fontSize: 16, fontWeight: '800', color: '#13294B', marginBottom: 20, textAlign: 'center' },
    
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, gap: 10 },
    toggleButton: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#EAE6DF', alignItems: 'center', backgroundColor: '#F9F6F0' },
    toggleActive: { borderColor: '#13294B', backgroundColor: '#FFFFFF' },
    toggleLabel: { fontSize: 11, color: '#888888', fontWeight: '800', marginBottom: 4, textTransform: 'uppercase' },
    toggleValue: { fontSize: 15, fontWeight: '900', color: '#888888' },
    toggleValueActive: { color: '#13294B' },
    
    gridScroll: { flex: 1, marginBottom: 15 },
    gridContainer: { paddingBottom: 10 },
    gridSlot: { width: '100%', paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: '#EAE6DF', marginBottom: 10, alignItems: 'center', backgroundColor: '#FFFFFF' },
    
    gridSlotSelected: { borderColor: '#13294B', backgroundColor: '#13294B' },
    gridSlotText: { fontSize: 15, fontWeight: '800', color: '#555555' },
    gridSlotTextSelected: { color: '#FFFFFF' },
    noTimesText: { width: '100%', textAlign: 'center', color: '#888888', marginTop: 20, fontWeight: '600' },
    
    timeActionButtons: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, gap: 10 },
    backToCalendarButtonSmall: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', flex: 0.3, borderWidth: 1, borderColor: '#13294B', backgroundColor: '#FFFFFF' },
    backToCalendarTextSmall: { color: '#13294B', fontSize: 15, fontWeight: '900' },
    
    confirmBookingButton: { backgroundColor: '#E8751A', paddingVertical: 14, borderRadius: 10, alignItems: 'center', flex: 0.7, borderWidth: 1, borderColor: '#E8751A' },
    confirmBookingDisabled: { backgroundColor: '#D4D0C8', borderColor: '#D4D0C8' },
    confirmBookingText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' }
});