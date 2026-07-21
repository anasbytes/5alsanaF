import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Share, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { LanguageContext } from '../utils/LanguageContext';
import { AuthContext } from '../utils/AuthContext';

export default function BookingReceiptScreen({ route, navigation }) {
    const { booking } = route.params;
    const { t, language, formatNumber } = useContext(LanguageContext);
    const { signOut } = useContext(AuthContext);
    const isRTL = language === 'ar';

    const [hasReviewed, setHasReviewed] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const isCompleted = booking.status?.toLowerCase() === 'completed';

    const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL;

    useEffect(() => {
        if (isCompleted) checkReviewStatus();
    }, []);

    const checkReviewStatus = async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetch(`${BACKEND_URL}/reviews/check/${booking.id}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
            });
            if (res.ok) {
                const data = await res.json();
                setHasReviewed(data.has_reviewed);
            }
        } catch (e) { console.error(e); }
    };

    const submitReview = async () => {
        if (rating === 0) {
            Alert.alert(t('error') || 'Error', t('select_rating') || 'Please select a rating.');
            return;
        }
        setSubmitting(true);
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetch(`${BACKEND_URL}/reviews`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    facility_id: booking.facility_id,
                    booking_id: booking.id,
                    rating,
                    comment: comment.trim() || undefined
                })
            });
            if (res.status === 401 || res.status === 403) { await signOut(); return; }
            if (res.ok) {
                setHasReviewed(true);
                Alert.alert(t('success') || 'Success', t('review_submitted') || 'Review submitted. Thank you!');
            } else if (res.status === 409) {
                setHasReviewed(true);
            } else {
                Alert.alert(t('error') || 'Error', t('review_failed') || 'Failed to submit review.');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSubmitting(false);
        }
    };

    const formatTo12Hour = (timeStr) => {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${m} ${ampm}`;
    };

    const locale = language === 'ar' ? 'ar-EG' : 'en-GB';
    const date = new Date(booking.booking_date).toLocaleDateString(locale, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const startTime = formatTo12Hour(booking.start_time);
    const endTime = formatTo12Hour(booking.end_time);

    const durationHours = (
        (parseInt(booking.end_time?.split(':')[0]) * 60 + parseInt(booking.end_time?.split(':')[1])) -
        (parseInt(booking.start_time?.split(':')[0]) * 60 + parseInt(booking.start_time?.split(':')[1]))
    ) / 60;

    const totalPrice = booking.total_price
        ? parseFloat(booking.total_price)
        : durationHours * parseFloat(booking.price_per_hour);

    const statusColors = {
        pending: '#F59E0B',
        confirmed: '#10B981',
        active: '#3B82F6',
        cancelled: '#EF4444',
        completed: '#6B7280',
    };

    const statusColor = statusColors[booking.status?.toLowerCase()] || '#6B7280';

    const handleShare = async () => {
        try {
            await Share.share({
                message: `${t('booking_receipt') || 'Booking Receipt'}\n\n${booking.facility_name}\n${date}\n${startTime} - ${endTime}\n${t('total') || 'Total'}: ${formatNumber(totalPrice.toFixed(0))} ${t('egp') || 'EGP'}`
            });
        } catch (e) { console.error(e); }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
                        <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#13294B" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('booking_receipt') || 'Booking Receipt'}</Text>
                    <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
                        <Ionicons name="share-outline" size={22} color="#13294B" />
                    </TouchableOpacity>
                </View>

                {/* Status Badge */}
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                        {t(booking.status?.toLowerCase()) || booking.status?.toUpperCase()}
                    </Text>
                </View>

                {/* Facility */}
                <View style={styles.card}>
                    <Ionicons name="business-outline" size={20} color="#E8751A" style={styles.cardIcon} />
                    <View style={styles.cardContent}>
                        <Text style={styles.cardLabel}>{t('facility') || 'Facility'}</Text>
                        <Text style={styles.cardValue}>{booking.facility_name}</Text>
                        <Text style={styles.cardSub}>{booking.facility_location}</Text>
                    </View>
                </View>

                {/* Date */}
                <View style={styles.card}>
                    <Ionicons name="calendar-outline" size={20} color="#E8751A" style={styles.cardIcon} />
                    <View style={styles.cardContent}>
                        <Text style={styles.cardLabel}>{t('date') || 'Date'}</Text>
                        <Text style={styles.cardValue}>{date}</Text>
                    </View>
                </View>

                {/* Time */}
                <View style={styles.card}>
                    <Ionicons name="time-outline" size={20} color="#E8751A" style={styles.cardIcon} />
                    <View style={styles.cardContent}>
                        <Text style={styles.cardLabel}>{t('time') || 'Time'}</Text>
                        <Text style={styles.cardValue}>{startTime} — {endTime}</Text>
                        <Text style={styles.cardSub}>{formatNumber(durationHours % 1 === 0 ? durationHours : durationHours.toFixed(1))} {t('hours') || 'hrs'}</Text>
                    </View>
                </View>

                {/* Price Breakdown */}
                <View style={styles.priceCard}>
                    <Text style={styles.priceTitle}>{t('price_breakdown') || 'Price Breakdown'}</Text>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>{t('price_per_hour') || 'Price / hr'}</Text>
                        <Text style={styles.priceValue}>{formatNumber(booking.price_per_hour)} {t('egp') || 'EGP'}</Text>
                    </View>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>{t('duration') || 'Duration'}</Text>
                        <Text style={styles.priceValue}>× {formatNumber(durationHours % 1 === 0 ? durationHours : durationHours.toFixed(1))}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.priceRow}>
                        <Text style={styles.totalLabel}>{t('total') || 'Total'}</Text>
                        <Text style={styles.totalValue}>{formatNumber(totalPrice.toFixed(0))} {t('egp') || 'EGP'}</Text>
                    </View>
                </View>

                {/* Review Section — only for completed bookings */}
                {isCompleted && (
                    <View style={styles.reviewCard}>
                        <Text style={styles.reviewTitle}>
                            {hasReviewed
                                ? (t('review_submitted') || 'Review Submitted ✓')
                                : (t('leave_review') || 'Leave a Review')}
                        </Text>
                        {!hasReviewed && (
                            <>
                                <View style={styles.starsRow}>
                                    {[1,2,3,4,5].map(s => (
                                        <TouchableOpacity key={s} onPress={() => setRating(s)}>
                                            <Ionicons
                                                name={s <= rating ? 'star' : 'star-outline'}
                                                size={32}
                                                color="#F59E0B"
                                                style={{ marginHorizontal: 4 }}
                                            />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <TextInput
                                    style={[styles.commentInput, isRTL && { textAlign: 'right' }]}
                                    placeholder={t('review_placeholder') || 'Share your experience (optional)'}
                                    placeholderTextColor="#AAAAAA"
                                    value={comment}
                                    onChangeText={setComment}
                                    multiline
                                    numberOfLines={3}
                                    maxLength={500}
                                />
                                <TouchableOpacity
                                    style={styles.submitButton}
                                    onPress={submitReview}
                                    disabled={submitting}
                                >
                                    {submitting
                                        ? <ActivityIndicator color="#FFFFFF" size="small" />
                                        : <Text style={styles.submitButtonText}>{t('submit_review') || 'Submit Review'}</Text>
                                    }
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                )}

                <Text style={styles.bookingId}>{t('booking_id') || 'Booking'} #{booking.id}</Text>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F9F6F0' },
    container: { padding: 20, paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#13294B' },
    iconButton: { backgroundColor: '#FFFFFF', width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
    statusBadge: { alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, marginBottom: 24 },
    statusText: { fontSize: 14, fontWeight: '700', letterSpacing: 1 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    cardIcon: { marginTop: 2, marginEnd: 14 },
    cardContent: { flex: 1 },
    cardLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
    cardValue: { fontSize: 15, fontWeight: '600', color: '#13294B' },
    cardSub: { fontSize: 13, color: '#888', marginTop: 2 },
    priceCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginTop: 8, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    priceTitle: { fontSize: 14, fontWeight: '700', color: '#13294B', marginBottom: 14 },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    priceLabel: { fontSize: 14, color: '#555' },
    priceValue: { fontSize: 14, color: '#13294B', fontWeight: '500' },
    divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 10 },
    totalLabel: { fontSize: 16, fontWeight: '700', color: '#13294B' },
    totalValue: { fontSize: 18, fontWeight: '800', color: '#E8751A' },
    reviewCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    reviewTitle: { fontSize: 15, fontWeight: '700', color: '#13294B', marginBottom: 14 },
    starsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
    commentInput: { backgroundColor: '#F9F6F0', borderRadius: 10, padding: 12, fontSize: 14, color: '#13294B', minHeight: 80, textAlignVertical: 'top', marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB' },
    submitButton: { backgroundColor: '#E8751A', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
    submitButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
    bookingId: { textAlign: 'center', color: '#BBBBBB', fontSize: 12, marginTop: 8 },
});