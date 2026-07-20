import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, Modal, Animated, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { LanguageContext } from '../utils/LanguageContext';
import { AuthContext } from '../utils/AuthContext';

export default function FacilityDetailsScreen({ route, navigation }) {
    const { facility, booking } = route.params;
    const { t, language, formatNumber } = useContext(LanguageContext);
    const { signOut } = useContext(AuthContext);

    const getDisplayStatus = (item) => {
        if (!item) return null;
        const statusStr = item.status.toLowerCase();

        if (statusStr === 'cancelled') return 'CANCELLED';
        if (statusStr === 'pending') return 'PENDING';

        const now = new Date();
        const d = new Date(item.booking_date);
        const [startH, startM] = item.start_time.split(':');
        const [endH, endM] = item.end_time.split(':');

        const startObj = new Date(d.getFullYear(), d.getMonth(), d.getDate(), parseInt(startH), parseInt(startM));
        const endObj = new Date(d.getFullYear(), d.getMonth(), d.getDate(), parseInt(endH), parseInt(endM));

        if (parseInt(endH) < parseInt(startH)) endObj.setDate(endObj.getDate() + 1);

        if (now >= startObj && now <= endObj) return 'ACTIVE';
        else if (now > endObj) return 'COMPLETED';
        else return 'CONFIRMED';
    };

    const [currentBookingStatus, setCurrentBookingStatus] = useState(getDisplayStatus(booking));
    const [fullFacility, setFullFacility] = useState(facility);
    const [isBusy, setIsBusy] = useState(false);
    const [facilityBookings, setFacilityBookings] = useState([]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [bookingStep, setBookingStep] = useState('calendar');
    const [selectedDate, setSelectedDate] = useState('');

    const [startTime, setStartTime] = useState(null);
    const [endTime, setEndTime] = useState(null);
    const [selectionMode, setSelectionMode] = useState('start');

    const [isFavorited, setIsFavorited] = useState(false);
    const [favLoading, setFavLoading] = useState(false);

    const fadeAnim = useRef(new Animated.Value(1)).current;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const timeSlots = [
        '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
        '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM',
        '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM',
        '08:00 PM', '09:00 PM', '10:00 PM', '11:00 PM',
        '12:00 AM', '01:00 AM', '02:00 AM', '03:00 AM'
    ];

    const formatTimeTo24Hour = (timeStr) => {
        if (!timeStr) return null;
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');

        if (hours === '12') hours = '00';
        if (modifier === 'PM') hours = parseInt(hours, 10) + 12;

        return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
    };

    const getNumericFrom24 = (time24) => {
        if (!time24) return 0;
        const [h, m] = time24.split(':');
        let hour = parseInt(h, 10);
        if (hour < 6) hour += 24;
        return hour + (parseInt(m, 10) / 60);
    };

    const createSlotDate = (timeStr, baseDateStr) => {
        const time24 = formatTimeTo24Hour(timeStr);
        const [h, m] = time24.split(':');
        let hour = parseInt(h, 10);
        const d = new Date(baseDateStr);
        if (hour < 6) d.setDate(d.getDate() + 1);
        d.setHours(hour, parseInt(m, 10), 0, 0);
        return d;
    };

    useEffect(() => {
        fetchFullFacility();
        checkFavoriteStatus();
        if (!booking) {
            if (facility?.id) fetchFacilityAvailability();
        }
    }, []);

    const checkFavoriteStatus = async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/favorites/check/${facility.id}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
            });
            if (res.ok) {
                const data = await res.json();
                setIsFavorited(data.is_favorited);
            }
        } catch (e) { console.error(e); }
    };

    const toggleFavorite = async () => {
        if (favLoading) return;
        setFavLoading(true);
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/favorites/toggle/${facility.id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
            });
            if (res.status === 401 || res.status === 403) { await signOut(); return; }
            if (res.ok) {
                const data = await res.json();
                setIsFavorited(data.is_favorited);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setFavLoading(false);
        }
    };

    const fetchFullFacility = async () => {
        try {
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/facilities/${facility.id}`);
            if (res.ok) {
                const data = await res.json();
                setFullFacility(data);
            }
        } catch (e) { console.error(e); }
    };

    const fetchFacilityAvailability = async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/bookings/facility/${facility.id}`, {
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
                    const slotDate = createSlotDate(time, todayStr);
                    if (slotDate > currentNow) {
                        const slotNum = getNumericFrom24(formatTimeTo24Hour(time));
                        const isBooked = bookedTimesToday.some(b => {
                            const bStart = getNumericFrom24(b.start_time);
                            const bEnd = getNumericFrom24(b.end_time);
                            return slotNum >= bStart && slotNum < bEnd;
                        });
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

        if (selectedDate === todayStr) {
            const currentTime = new Date();
            availableSlots = availableSlots.filter(time => {
                const slotDate = createSlotDate(time, selectedDate);
                return slotDate > currentTime;
            });
        }

        if (selectionMode === 'start') {
            return availableSlots.filter(time => {
                const slotNum = getNumericFrom24(formatTimeTo24Hour(time));
                return !bookedTimesOnDate.some(b => {
                    const bStart = getNumericFrom24(b.start_time);
                    const bEnd = getNumericFrom24(b.end_time);
                    return slotNum >= bStart && slotNum < bEnd;
                });
            });
        } else {
            if (!startTime) return [];

            const startIndex = availableSlots.indexOf(startTime);
            if (startIndex === -1) return [];

            const startNum = getNumericFrom24(formatTimeTo24Hour(startTime));
            const possibleEndTimes = availableSlots.slice(startIndex + 1);

            return possibleEndTimes.filter(endTimeCandidate => {
                const endNum = getNumericFrom24(formatTimeTo24Hour(endTimeCandidate));
                const hasOverlap = bookedTimesOnDate.some(b => {
                    const bStart = getNumericFrom24(b.start_time);
                    const bEnd = getNumericFrom24(b.end_time);
                    return Math.max(startNum, bStart) < Math.min(endNum, bEnd);
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
        setIsSubmitting(true);
        try {
            const token = await SecureStore.getItemAsync('token');
            const dbStartTime = formatTimeTo24Hour(startTime);
            const dbEndTime = formatTimeTo24Hour(endTime);

            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/bookings`, {
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
                alert(t('request_sent') || 'Request Sent! Waiting for host approval.');
                setIsModalVisible(false);
                fetchFacilityAvailability();
            } else if (response.status === 401 || response.status === 403) {
                await signOut();
            } else if (response.status === 409) {
                // 🛡️ DOUBLE-BOOKING PREVENTED
                alert(t('slot_taken') || 'Too late! Someone just booked this exact time slot. Please choose another time.');

                fetchFacilityAvailability();

                setStartTime(null);
                setEndTime(null);
                setSelectionMode('start');
            } else {
                alert(t('booking_failed') || 'Failed to book. Please try again.');
            }
        } catch (error) {
            console.error("Booking error:", error);

            // 🛡️ OFFLINE PROTECTION
            if (error instanceof TypeError || error.message.includes('Network')) {
                alert(t('offline_error') || 'You appear to be offline. Please check your connection and try again.');
            } else {
                alert(t('server_error') || 'Something went wrong connecting to the server.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelPress = () => {
        Alert.alert(
            t('cancel_request') || "Cancel Request",
            `${t('cancel_confirm_msg') || 'Are you sure you want to cancel your request for'} ${fullFacility?.name || t('unnamed_facility') || 'this facility'}?`,
            [
                { text: t('no_keep_it') || "No, keep it", style: "cancel" },
                { text: t('yes_cancel') || "Yes, cancel it", style: "destructive", onPress: confirmCancellation }
            ]
        );
    };

    const confirmCancellation = async () => {
        setIsSubmitting(true);
        try {
            const token = await SecureStore.getItemAsync('token');
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/bookings/${booking.id}/cancel`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'ngrok-skip-browser-warning': 'true'
                }
            });

            if (response.ok) {
                setCurrentBookingStatus('CANCELLED');
                Alert.alert(t('success') || "Success", t('request_cancelled_success') || "Your request has been cancelled.");
            } else if (response.status === 401 || response.status === 403) {
                await signOut();
            } else {
                Alert.alert(t('error') || "Error", t('cancel_failed') || "Failed to cancel. Please try again.");
            }
        } catch (error) {
            console.error("Cancellation Error:", error);

            // 🛡️ OFFLINE PROTECTION
            if (error instanceof TypeError || error.message.includes('Network')) {
                Alert.alert(t('offline_error') || "Offline", t('offline_msg') || "You appear to be offline. Please check your connection.");
            } else {
                Alert.alert(t('error') || "Error", t('server_error') || "Something went wrong.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const isCancelledOrCompleted = currentBookingStatus === 'CANCELLED' || currentBookingStatus === 'COMPLETED';

    const locale = language === 'ar' ? 'ar-EG' : 'en-GB';

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>

                <View style={styles.paddedBlock}>
                    <View style={styles.headerRow}>
                        <Text style={styles.title} numberOfLines={2}>{fullFacility?.name || t('unnamed_facility') || 'Unnamed Facility'}</Text>

                        {!booking ? (
                            <View style={[styles.statusBadge, isBusy ? styles.statusBusy : styles.statusFree]}>
                                <Text style={styles.statusText}>{isBusy ? (t('busy') || 'BUSY') : (t('available') || 'AVAILABLE')}</Text>
                            </View>
                        ) : (
                            <View style={[
                                styles.statusBadge,
                                currentBookingStatus === 'CANCELLED' ? styles.statusCancelled :
                                    currentBookingStatus === 'COMPLETED' ? styles.statusCompleted :
                                        currentBookingStatus === 'PENDING' ? styles.statusPending :
                                            currentBookingStatus === 'ACTIVE' ? styles.statusActive : styles.statusConfirmed
                            ]}>
                                <Text style={styles.statusText}>
                                    {currentBookingStatus ? (t(currentBookingStatus.toLowerCase()) || currentBookingStatus) : 'UNKNOWN'}
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                            {fullFacility?.type ? (t(fullFacility.type.toLowerCase()) || fullFacility.type.toUpperCase()) : (t('general') || 'GENERAL')}
                        </Text>
                    </View>
                </View>

                <View style={styles.imageContainer}>
                    <Image source={fullFacility?.image_url ? { uri: fullFacility.image_url } : require('../assets/no-image-placeholder.png')} style={styles.facilityImage} />
                </View>

                <ScrollView contentContainerStyle={styles.bottomGroup} showsVerticalScrollIndicator={false}>
                    <View style={styles.infoBox}>
                        <View style={styles.infoRow}>
                            <Ionicons name="location" size={18} color="#888" />
                            <Text style={styles.infoText}>{fullFacility?.location || t('location_not_provided') || 'Location not provided'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Ionicons name="cash-outline" size={18} color="#888" />
                            <Text style={styles.infoText}><Text style={styles.priceHighlight}>{fullFacility?.price_per_hour || '--'}</Text> {t('egp_hr') || 'EGP / hr'}</Text>
                        </View>

                        {fullFacility?.description ? (
                            <View>
                                <View style={styles.divider} />
                                <View style={styles.descriptionSection}>
                                    <Text style={styles.descriptionTitle}>{t('details') || 'Details'}</Text>
                                    <Text style={styles.descriptionText}>{fullFacility.description}</Text>
                                </View>
                            </View>
                        ) : null}

                        {booking && (
                            <View style={styles.bookingDetails}>
                                <View style={styles.divider} />
                                <View style={styles.infoRow}>
                                    <Ionicons name="calendar-outline" size={18} color="#13294B" />
                                    <Text style={styles.infoTextValue}>{new Date(booking.booking_date).toLocaleDateString(locale, { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Ionicons name="time-outline" size={18} color="#13294B" />
                                    <Text style={[styles.infoTextValue, { direction: 'ltr' }]}>{formatTo12Hour(booking.start_time)} - {formatTo12Hour(booking.end_time)}</Text>
                                </View>
                            </View>
                        )}
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={24} color="#13294B" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.favoriteButton} onPress={toggleFavorite} disabled={favLoading}>
                            <Ionicons
                                name={isFavorited ? 'heart' : 'heart-outline'}
                                size={24}
                                color={isFavorited ? '#E8751A' : '#13294B'}
                            />
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
                                        {currentBookingStatus === 'CANCELLED' ? (t('cancelled') || 'Cancelled') :
                                            currentBookingStatus === 'COMPLETED' ? (t('completed') || 'Completed') :
                                                (t('cancel_request') || 'Cancel Request')}
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
                                <Text style={styles.bookButtonText}>{t('request_book') || 'Request to Book'}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>

            </View>

            <Modal animationType="slide" transparent={true} visible={isModalVisible} onRequestClose={() => setIsModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>

                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {bookingStep === 'calendar' ? (t('select_date') || 'Select Date') : (t('select_time') || 'Select Time')}
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
                                    <Text style={styles.selectedDateText}>{new Date(selectedDate).toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}</Text>

                                    <View style={styles.toggleRow}>
                                        <TouchableOpacity
                                            style={[styles.toggleButton, selectionMode === 'start' && styles.toggleActive]}
                                            onPress={() => setSelectionMode('start')}
                                        >
                                            <Text style={styles.toggleLabel}>{t('start_time') || 'Start Time'}</Text>
                                            <Text style={[styles.toggleValue, selectionMode === 'start' && styles.toggleValueActive]}>
                                                {startTime || '--:--'}
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.toggleButton, selectionMode === 'end' && styles.toggleActive]}
                                            onPress={() => setSelectionMode('end')}
                                        >
                                            <Text style={styles.toggleLabel}>{t('end_time') || 'End Time'}</Text>
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
                                                        <Text style={[styles.gridSlotText, isSelected && styles.gridSlotTextSelected, { direction: 'ltr' }]}>
                                                            {time}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })
                                        ) : (
                                            <Text style={styles.noTimesText}>{t('no_valid_slots') || 'No valid slots available based on selection.'}</Text>
                                        )}
                                    </ScrollView>

                                    <View style={styles.timeActionButtons}>
                                        <TouchableOpacity
                                            style={styles.backToCalendarButtonSmall}
                                            onPress={() => triggerFadeTransition('calendar')}
                                        >
                                            <Text style={styles.backToCalendarTextSmall}>{t('back') || 'Back'}</Text>
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
                                                <Text style={styles.confirmBookingText}>{t('send_request') || 'Send Request'}</Text>
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
    container: { flex: 1, paddingTop: 5 },
    paddedBlock: { paddingHorizontal: 20, marginBottom: 12 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    title: { fontSize: 26, fontWeight: '900', color: '#13294B', flex: 1, letterSpacing: -0.5 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginStart: 10, alignItems: 'center', justifyContent: 'center' },
    statusFree: { backgroundColor: '#4CAF50' },
    statusBusy: { backgroundColor: '#F44336' },
    statusPending: { backgroundColor: '#E8751A' },
    statusActive: { backgroundColor: '#2196F3' },
    statusConfirmed: { backgroundColor: '#4CAF50' },
    statusCancelled: { backgroundColor: '#F44336' },
    statusCompleted: { backgroundColor: '#9E9E9E' },
    statusText: { color: '#FFFFFF', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
    badge: { alignSelf: 'flex-start', backgroundColor: '#13294B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    imageContainer: { paddingHorizontal: 20, marginBottom: 15 },
    facilityImage: {
        width: '100%', height: 260,
        borderRadius: 16,
        borderWidth: 1, borderColor: '#13294B',
        resizeMode: 'cover',
    },
    bottomGroup: { paddingHorizontal: 20, paddingBottom: 40 },
    infoBox: {
        backgroundColor: '#FFFFFF', padding: 24, borderRadius: 16,
        borderWidth: 1, borderColor: '#13294B',
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
    infoText: { fontSize: 16, color: '#555555', fontWeight: '600', flexShrink: 1 },
    infoTextValue: { fontSize: 16, color: '#13294B', fontWeight: '800' },
    priceHighlight: { color: '#E8751A', fontWeight: '900', fontSize: 18 },
    descriptionSection: { marginVertical: 8 },
    descriptionTitle: { fontSize: 13, color: '#888888', fontWeight: '800', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
    descriptionText: { fontSize: 15, color: '#555555', fontWeight: '500', lineHeight: 22 },
    bookingDetails: { marginTop: 10 },
    divider: { height: 1, backgroundColor: '#EAE6DF', marginVertical: 13 },
    buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30, gap: 12 },
    backButton: { backgroundColor: '#FFFFFF', width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#13294B' },
    bookButton: { backgroundColor: '#E8751A', flex: 1, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E8751A' },
    bookButtonDisabled: { backgroundColor: '#D4D0C8', borderColor: '#D4D0C8' },
    cancelButtonActive: { backgroundColor: '#F44336', borderColor: '#F44336' },
    bookButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
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
    confirmBookingText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
    favoriteButton: { backgroundColor: '#FFFFFF', width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#13294B' },
});