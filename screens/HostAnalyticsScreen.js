import React, { useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../utils/AuthContext';
import { LanguageContext } from '../utils/LanguageContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL;

export default function HostAnalyticsScreen() {
    const { signOut } = useContext(AuthContext);
    const { t, language, formatNumber } = useContext(LanguageContext);
    const isRTL = language === 'ar';

    const [loading, setLoading] = useState(true);
    const [bookings, setBookings] = useState([]);

    useFocusEffect(
        useCallback(() => {
            fetchBookings();
        }, [])
    );

    const fetchBookings = async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetch(`${BACKEND_URL}/bookings/host/me`, {
                headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
            });
            if (res.status === 401 || res.status === 403) { await signOut(); return; }
            if (res.ok) {
                const data = await res.json();
                setBookings(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const confirmed = bookings.filter(b => ['confirmed', 'active', 'completed'].includes(b.status));
    const totalRevenue = confirmed.reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0);
    const totalBookings = bookings.length;
    const pendingCount = bookings.filter(b => b.status === 'pending').length;
    const cancelledCount = bookings.filter(b => b.status === 'cancelled').length;
    const completedCount = bookings.filter(b => b.status === 'completed').length;
    const confirmedCount = bookings.filter(b => ['confirmed', 'active'].includes(b.status)).length;

    const weeksData = (() => {
        const weeks = [0, 0, 0, 0];
        const now = new Date();
        bookings.forEach(b => {
            const diff = (now - new Date(b.booking_date)) / (1000 * 60 * 60 * 24 * 7);
            if (diff >= 0 && diff < 4) weeks[Math.floor(diff)]++;
        });
        return weeks.reverse();
    })();

    const hourCounts = {};
    bookings.forEach(b => {
        if (!b.start_time) return;
        const hour = parseInt(b.start_time.split(':')[0]);
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const hourEntries = Object.entries(hourCounts)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

    const facilityCounts = {};
    bookings.forEach(b => {
        facilityCounts[b.facility_name] = (facilityCounts[b.facility_name] || 0) + 1;
    });
    const topFacilities = Object.entries(facilityCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const maxWeek = Math.max(...weeksData, 1);
    const maxHour = Math.max(...Object.values(hourCounts), 1);
    const maxFacility = topFacilities[0]?.[1] || 1;

    const weekLabels = [
        t('analytics_3w_ago') || '3w ago',
        t('analytics_2w_ago') || '2w ago',
        t('analytics_last_week') || 'Last week',
        t('analytics_this_week') || 'This week',
    ];

    const formatHour = (h) => {
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const h12 = hour % 12 || 12;
        return `${h12}${ampm}`;
    };

    if (loading) return (
        <View style={styles.centered}>
            <ActivityIndicator size="large" color="#E8751A" />
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

                <View style={styles.row}>
                    <View style={[styles.statCard, { backgroundColor: '#E8751A' }]}>
                        <Ionicons name="cash-outline" size={22} color="#fff" />
                        <Text style={styles.statValue}>{formatNumber(Math.round(totalRevenue))}</Text>
                        <Text style={styles.statLabel}>{t('analytics_revenue') || 'Revenue (EGP)'}</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#13294B' }]}>
                        <Ionicons name="calendar-outline" size={22} color="#fff" />
                        <Text style={styles.statValue}>{formatNumber(totalBookings)}</Text>
                        <Text style={styles.statLabel}>{t('analytics_total_bookings') || 'Total Bookings'}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('analytics_status_breakdown') || 'Status Breakdown'}</Text>
                    {[
                        { label: t('confirmed') || 'Confirmed', count: confirmedCount, color: '#10B981' },
                        { label: t('pending') || 'Pending', count: pendingCount, color: '#F59E0B' },
                        { label: t('completed') || 'Completed', count: completedCount, color: '#6B7280' },
                        { label: t('cancelled') || 'Cancelled', count: cancelledCount, color: '#EF4444' },
                    ].map(({ label, count, color }) => (
                        <View key={label} style={styles.statusRow}>
                            <Text style={[styles.statusLabel, isRTL && { textAlign: 'right' }]}>{label}</Text>
                            <View style={styles.barTrack}>
                                <View style={[styles.barFill, {
                                    width: totalBookings > 0 ? `${(count / totalBookings) * 100}%` : '0%',
                                    backgroundColor: color
                                }]} />
                            </View>
                            <Text style={styles.statusCount}>{formatNumber(count)}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('analytics_weekly') || 'Bookings per Week'}</Text>
                    <View style={styles.barChart}>
                        {weeksData.map((count, i) => (
                            <View key={i} style={styles.barColumn}>
                                <Text style={styles.barCountLabel}>{count > 0 ? formatNumber(count) : ''}</Text>
                                <View style={styles.barWrapper}>
                                    <View style={[styles.weekBar, {
                                        height: count > 0 ? `${(count / maxWeek) * 100}%` : 4,
                                        backgroundColor: i === 3 ? '#E8751A' : '#13294B'
                                    }]} />
                                </View>
                                <Text style={styles.barLabel}>{weekLabels[i]}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {hourEntries.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('analytics_busiest_hours') || 'Busiest Hours'}</Text>
                        {hourEntries.map(([hour, count]) => (
                            <View key={hour} style={styles.statusRow}>
                                <Text style={styles.statusLabel}>{formatHour(hour)}</Text>
                                <View style={styles.barTrack}>
                                    <View style={[styles.barFill, {
                                        width: `${(count / maxHour) * 100}%`,
                                        backgroundColor: '#E8751A'
                                    }]} />
                                </View>
                                <Text style={styles.statusCount}>{formatNumber(count)}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {topFacilities.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('analytics_top_facilities') || 'Top Facilities'}</Text>
                        {topFacilities.map(([name, count], i) => (
                            <View key={name} style={styles.statusRow}>
                                <Text style={[styles.statusLabel, { flex: 2 }]} numberOfLines={1}>{name}</Text>
                                <View style={[styles.barTrack, { flex: 2 }]}>
                                    <View style={[styles.barFill, {
                                        width: `${(count / maxFacility) * 100}%`,
                                        backgroundColor: i === 0 ? '#E8751A' : '#13294B'
                                    }]} />
                                </View>
                                <Text style={styles.statusCount}>{formatNumber(count)}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {totalBookings === 0 && (
                    <View style={styles.emptyState}>
                        <Ionicons name="bar-chart-outline" size={48} color="#D4D0C8" />
                        <Text style={styles.emptyText}>{t('analytics_no_data') || 'No bookings yet. Analytics will appear here once you receive bookings.'}</Text>
                    </View>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F9F6F0' },
    container: { padding: 16, paddingBottom: 40 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9F6F0' },
    row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    statCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', gap: 6 },
    statValue: { fontSize: 22, fontWeight: '800', color: '#fff' },
    statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
    section: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
    statusLabel: { fontSize: 13, color: '#13294B', flex: 1 },
    statusCount: { fontSize: 13, fontWeight: '700', color: '#13294B', width: 24, textAlign: 'right' },
    barTrack: { flex: 3, height: 8, backgroundColor: '#F0EDE8', borderRadius: 4, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 4 },
    barChart: { flexDirection: 'row', height: 140, alignItems: 'flex-end', gap: 8 },
    barColumn: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
    barWrapper: { width: '100%', height: 100, justifyContent: 'flex-end' },
    weekBar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 4 },
    barLabel: { fontSize: 10, color: '#888', marginTop: 4, textAlign: 'center' },
    barCountLabel: { fontSize: 11, fontWeight: '700', color: '#13294B', marginBottom: 2 },
    emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
    emptyText: { fontSize: 14, color: '#AAAAAA', textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
});