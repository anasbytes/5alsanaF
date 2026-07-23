import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, Image, RefreshControl, Animated } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { AuthContext } from '../utils/AuthContext';
import { LanguageContext } from '../utils/LanguageContext';
import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect } from '@react-navigation/native';
import StarRating from '../components/StarRating';

const CATEGORIES = [
    { value: 'All', labelKey: 'type_all' },
    { value: 'Football', labelKey: 'type_football' },
    { value: 'Padel', labelKey: 'type_padel' },
    { value: 'Ping Pong', labelKey: 'type_ping_pong' },
    { value: 'Basketball', labelKey: 'type_basketball' },
    { value: 'Playstation', labelKey: 'type_playstation' }
];

const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// --- CUSTOM SKELETON LOADER FOR HOME SCREEN ---
const SkeletonCard = () => {
    const fadeAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(fadeAnim, { toValue: 0.8, duration: 800, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 0.3, duration: 800, useNativeDriver: true })
            ])
        ).start();
    }, [fadeAnim]);

    return (
        <View style={styles.card}>
            <Animated.View style={[styles.skeletonBlock, { height: 160, width: '100%', opacity: fadeAnim }]} />
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <Animated.View style={[styles.skeletonBlock, { width: '60%', height: 20, borderRadius: 4, opacity: fadeAnim }]} />
                    <Animated.View style={[styles.skeletonBlock, { width: '20%', height: 20, borderRadius: 4, opacity: fadeAnim }]} />
                </View>
                <View style={styles.cardBody}>
                    <Animated.View style={[styles.skeletonBlock, { width: 70, height: 24, borderRadius: 6, opacity: fadeAnim }]} />
                    <Animated.View style={[styles.skeletonBlock, { width: 60, height: 24, borderRadius: 6, marginLeft: 8, opacity: fadeAnim }]} />
                    <Animated.View style={[styles.skeletonBlock, { width: 100, height: 16, borderRadius: 4, marginLeft: 10, marginTop: 4, opacity: fadeAnim }]} />
                </View>
            </View>
        </View>
    );
};
// ----------------------------------------------

export default function HomeScreen({ navigation }) {
    const { signOut } = useContext(AuthContext) || {};
    const { t, language, formatNumber = (val) => val } = useContext(LanguageContext) || {};
    const isRTL = language === 'ar';

    const [facilities, setFacilities] = useState([]);
    const [recentFacilities, setRecentFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeCategory, setActiveCategory] = useState('All');

    const [userLocation, setUserLocation] = useState(t('locating') || 'Locating...');
    const [userCoords, setUserCoords] = useState(null);

    const [locationModalVisible, setLocationModalVisible] = useState(false);
    const [searchLocationText, setSearchLocationText] = useState('');
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);

    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // Load Recents when returning to Home Screen
    useFocusEffect(
        useCallback(() => {
            loadRecentFacilities();
        }, [])
    );

    useEffect(() => {
        fetchUserLocation();
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        setPage(0);
        setHasMore(true);
        setLoading(true);
        fetchFacilities(0, controller.signal, activeCategory);
        return () => controller.abort();
    }, [activeCategory]);

    const loadRecentFacilities = async () => {
        try {
            const stored = await SecureStore.getItemAsync('recent_facilities');
            if (stored) {
                setRecentFacilities(JSON.parse(stored));
            }
        } catch (e) {
            console.log("Error loading recents:", e);
        }
    };

    const handleFacilityPress = async (facility) => {
        try {
            // Fetch existing
            const stored = await SecureStore.getItemAsync('recent_facilities');
            let recents = stored ? JSON.parse(stored) : [];

            // Remove if already exists so we can bump it to the front
            recents = recents.filter(f => f.id !== facility.id);

            // Minify object to avoid SecureStore 2048 byte overflow limit
            const minifiedFacility = {
                id: facility.id,
                name: facility.name,
                price_per_hour: facility.price_per_hour,
                images: facility.images,
                type: facility.type,
                location: facility.location,
                avg_rating: facility.avg_rating,
review_count: facility.review_count
            };

            // Add to front & limit to 5
            recents.unshift(minifiedFacility);
            recents = recents.slice(0, 5);

            await SecureStore.setItemAsync('recent_facilities', JSON.stringify(recents));
            setRecentFacilities(recents);
        } catch (e) {
            console.log('Error saving recent:', e);
        }

        navigation.navigate('FacilityDetails', { facility });
    };

    const fetchUserLocation = async () => {
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setUserLocation(t('location_denied') || 'Location Denied');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setUserCoords({ latitude: location.coords.latitude, longitude: location.coords.longitude });

            let geocode = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });

            if (geocode.length > 0) {
                const place = geocode[0];
                const city = place.city || place.subregion || place.region || 'Unknown City';
                setUserLocation(`${city}, ${place.country}`);
            } else {
                setUserLocation(t('location_unavailable') || 'Location Unavailable');
            }
        } catch (error) {
            setUserLocation(t('location_error') || 'Location Error');
        }
    };

    const handleLocationSearch = async () => {
        if (!searchLocationText.trim()) return;
        setIsSearchingLocation(true);
        try {
            const geocodeResult = await Location.geocodeAsync(searchLocationText.trim());
            if (geocodeResult.length > 0) {
                setUserLocation(searchLocationText.trim());
                setUserCoords({ latitude: geocodeResult[0].latitude, longitude: geocodeResult[0].longitude });
                setLocationModalVisible(false);
                setSearchLocationText('');
            } else {
                Alert.alert(t('not_found') || "Not Found", t('location_not_found_msg') || "We couldn't find that location.");
            }
        } catch (error) {
            Alert.alert(t('error') || "Error", t('location_error_msg') || "Could not search for location.");
        } finally {
            setIsSearchingLocation(false);
        }
    };

    const fetchFacilities = async (pageNumber, signal, category = activeCategory) => {
        const networkState = await NetInfo.fetch();
        if (!networkState.isConnected) {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
            return;
        }

        try {
            const token = await SecureStore.getItemAsync('token');
            const limit = 10;
            const offset = pageNumber * limit;
            const typeParam = category && category !== 'All' ? `&type=${encodeURIComponent(category)}` : '';

            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/facilities?limit=${limit}&offset=${offset}${typeParam}`, {
                signal,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'ngrok-skip-browser-warning': 'true'
                }
            });

            if (response.status === 401 || response.status === 403) {
                if (signOut) await signOut();
                return;
            }

            if (!response.ok) throw new Error(`Server returned ${response.status}`);

            const data = await response.json();
            if (data.length < limit) setHasMore(false);

            if (pageNumber === 0) setFacilities(data);
            else setFacilities(prev => [...prev, ...data]);
        }
        catch (error) {
            if (error.name === 'AbortError') return;
            console.error("Fetch Error:", error);
        }
        finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        setPage(0);
        setHasMore(true);
        fetchFacilities(0);
    };

    const loadMoreFacilities = () => {
        if (!loadingMore && hasMore && !loading) {
            setLoadingMore(true);
            const nextPage = page + 1;
            setPage(nextPage);
            fetchFacilities(nextPage);
        }
    };

    const renderFooter = () => {
        if (!loadingMore) return null;
        return <ActivityIndicator size="small" color="#E8751A" style={{ marginVertical: 20 }} />;
    };

    let displayList = facilities;

    if (userCoords) {
        displayList = displayList.map(f => {
            const dist = getDistance(
                userCoords.latitude, userCoords.longitude,
                parseFloat(f.latitude), parseFloat(f.longitude)
            );
            return { ...f, distance: dist };
        }).sort((a, b) => a.distance - b.distance);
    }

    const renderRecentFacility = ({ item }) => (
        <TouchableOpacity
            style={styles.recentCard}
            activeOpacity={0.7}
            onPress={() => handleFacilityPress(item)}
        >
            <Image source={item.images?.length > 0 ? { uri: item.images[0] } : require('../assets/no-image-placeholder.png')} style={styles.recentImage} />
            <View style={styles.recentInfo}>
                <Text style={styles.recentTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.recentPrice}>{formatNumber(item.price_per_hour)} {t('egp') || 'EGP'}</Text>
            </View>
        </TouchableOpacity>
    );

    const renderListHeader = () => (
        <View style={{ marginBottom: 5 }}>
            {recentFacilities.length > 0 && (
                <View style={styles.recentSection}>
                    <Text style={[styles.sectionTitle, { paddingLeft: 10, paddingRight: 20 }]}>{t('recently_viewed') || 'Recently Viewed'}</Text>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={recentFacilities}
                        keyExtractor={(item) => 'recent_' + item.id}
                        contentContainerStyle={{ paddingLeft: 10, paddingRight: 20, paddingBottom: 10, paddingTop: 5 }}
                        renderItem={renderRecentFacility}
                    />
                </View>
            )}
            {/* Show title only if not actively loading the whole category to avoid weird flashing */}
            {!loading && (
                <Text style={[styles.sectionTitle, { paddingLeft: 10, paddingRight: 20, marginBottom: 15 }]}>
                    {t('explore_facilities') || 'Explore Facilities'}
                </Text>
            )}
        </View>
    );

    const renderFacility = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => handleFacilityPress(item)}
        >
            <Image source={item.images?.length > 0 ? { uri: item.images[0] } : require('../assets/no-image-placeholder.png')} style={styles.cardImage} />

            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.cardPrice}>{formatNumber(item.price_per_hour)} <Text style={{ fontSize: 11 }}>{t('egp')}</Text></Text>
                </View>
                <View style={styles.cardBody}>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{t(item.type?.toLowerCase() || 'general') || item.type?.toUpperCase()}</Text>
                    </View>
                    {item.distance !== undefined && item.distance !== Infinity && (
                        <View style={styles.distanceBadge}>
                            <Ionicons name="navigate" size={10} color="#1565C0" />
                            <Text style={styles.distanceText}>
                                {formatNumber(item.distance.toFixed(1))} {t('km_short')}
                            </Text>
                        </View>
                    )}
                    <View style={styles.locationContainer}>
                        <Ionicons name="location" size={14} color="#888" />
                        <Text style={styles.cardLocation} numberOfLines={1}>{item.location}</Text>
                        <StarRating rating={item.avg_rating} count={item.review_count} />
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.topHeaderContainer}>
                <TouchableOpacity style={styles.header} onPress={() => setLocationModalVisible(true)}>
                    <Text style={styles.headerSubText}>{t('your_location')}</Text>
                    <View style={styles.locationRow}>
                        <Text style={styles.headerTitle} numberOfLines={1}>{userLocation}</Text>
                        <Ionicons name="chevron-down" size={20} color="#13294B" style={{ marginTop: 4, marginStart: 4 }} />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.mapNavigateBtn} onPress={() => navigation.navigate('MapScreen')}>
                    <Ionicons name="map" size={16} color="#FFF" />
                    <Text style={styles.mapNavigateText}>{t('map_view')}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.categoriesContainer}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={CATEGORIES}
                    keyExtractor={(item) => item.value}
                    contentContainerStyle={{ paddingEnd: 20 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.categoryBadge, activeCategory === item.value && styles.activeCategoryBadge]}
                            onPress={() => setActiveCategory(item.value)}
                        >
                            <Text style={[styles.categoryText, activeCategory === item.value && styles.activeCategoryText]}>
                                {t(item.labelKey)}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            <FlatList
                data={loading ? [1, 2, 3] : displayList}
                keyExtractor={(item, index) => loading ? `skel_${index}` : item.id.toString()}
                renderItem={({ item, index }) => loading ? <SkeletonCard key={index} /> : renderFacility({ item })}
                style={{ flex: 1 }}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={renderListHeader}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8751A" />}
                onEndReached={loadMoreFacilities}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={
                    !loading && (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="business-outline" size={50} color="#D0D0D0" />
                            <Text style={styles.emptyText}>{t('no_facilities')}</Text>
                        </View>
                    )
                }
            />

            <Modal visible={locationModalVisible} animationType="fade" transparent={true} onRequestClose={() => setLocationModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('change_location')}</Text>
                            <TouchableOpacity onPress={() => setLocationModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#888" />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={[styles.locationInput, { textAlign: isRTL ? 'right' : 'left' }]}
                            placeholder={t('search_placeholder')}
                            placeholderTextColor="#A0A0A0"
                            value={searchLocationText}
                            onChangeText={setSearchLocationText}
                        />
                        <TouchableOpacity style={styles.searchLocationBtn} onPress={handleLocationSearch}>
                            {isSearchingLocation ? <ActivityIndicator color="#FFF" /> : <Text style={styles.searchLocationBtnText}>{t('save_location')}</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.useCurrentBtn} onPress={() => { setLocationModalVisible(false); fetchUserLocation(); }}>
                            <Ionicons name="navigate" size={18} color="#13294B" style={{ marginEnd: 6 }} />
                            <Text style={styles.useCurrentBtnText}>{t('use_current')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F9F6F0' },
    topHeaderContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
    header: { flex: 1, paddingEnd: 10 },
    headerSubText: { fontSize: 13, color: '#888888', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    locationRow: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#13294B', marginTop: 4, flexShrink: 1 },
    mapNavigateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#13294B', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginTop: 5 },
    mapNavigateText: { color: '#FFF', fontWeight: '800', fontSize: 13, marginStart: 6 },
    categoriesContainer: { paddingStart: 20, marginBottom: 15 },
    categoryBadge: { paddingHorizontal: 18, minHeight: 40, paddingVertical: 8, borderRadius: 10, backgroundColor: '#FFFFFF', marginEnd: 10, borderWidth: 1, borderColor: '#D4D0C8', justifyContent: 'center', alignItems: 'center' },
    activeCategoryBadge: { backgroundColor: '#13294B', borderColor: '#13294B' },
    categoryText: { fontSize: 13, fontWeight: '700', color: '#888888', textAlign: 'center' },
    activeCategoryText: { color: '#FFFFFF' },

    // --- RECENTLY VIEWED STYLES ---
    recentSection: { marginBottom: 15 },
    sectionTitle: { fontSize: 22, fontWeight: '800', color: '#13294B', marginBottom: 10, letterSpacing: 0.2, },
    recentCard: { width: 160, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#D4D0C8', marginEnd: 12, overflow: 'hidden', shadowColor: '#13294B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
    recentImage: { width: '100%', height: 90, resizeMode: 'cover', borderBottomWidth: 1, borderColor: '#EAE6DF' },
    recentInfo: { padding: 10 },
    recentTitle: { fontSize: 14, fontWeight: '800', color: '#13294B', marginBottom: 4 },
    recentPrice: { fontSize: 13, fontWeight: '800', color: '#E8751A' },
    // ------------------------------

    listContainer: { paddingLeft: 10, paddingRight: 10, paddingBottom: 20 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#D4D0C8', marginBottom: 16, shadowColor: '#13294B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2, overflow: 'hidden' },
    cardImage: { width: '100%', height: 160, resizeMode: 'cover', borderBottomWidth: 1, borderColor: '#EAE6DF' },
    cardContent: { padding: 16 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    cardTitle: { fontSize: 18, fontWeight: '800', color: '#13294B', flex: 1, marginEnd: 10, letterSpacing: 0.2 },
    cardPrice: { fontSize: 16, fontWeight: '800', color: '#E8751A' },
    cardBody: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
    badge: { backgroundColor: '#E8751A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, alignSelf: 'flex-start', justifyContent: 'center', marginBottom: 4 },
    badgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5, textAlign: 'center' },
    distanceBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginStart: 8, marginBottom: 4 },
    distanceText: { fontSize: 10, fontWeight: '800', color: '#1565C0', marginStart: 3 },
    locationContainer: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginStart: 10, marginBottom: 4 },
    cardLocation: { fontSize: 13, color: '#555555', marginStart: 4, flexShrink: 1, fontWeight: '600' },
    emptyContainer: { alignItems: 'center', marginTop: 30 },
    emptyText: { textAlign: 'center', marginTop: 15, fontSize: 15, color: '#888888', fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: '#FFF', borderRadius: 16, width: '100%', padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#13294B' },
    closeBtn: { padding: 4 },
    modalSubtitle: { color: '#888', fontSize: 13, marginBottom: 20 },
    locationInput: { backgroundColor: '#F9F6F0', borderWidth: 1, borderColor: '#D4D0C8', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: '#13294B', marginBottom: 15 },
    searchLocationBtn: { backgroundColor: '#E8751A', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
    searchLocationBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    useCurrentBtn: { flexDirection: 'row', backgroundColor: '#F0F4F8', borderWidth: 1, borderColor: '#D4D0C8', borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    useCurrentBtnText: { color: '#13294B', fontWeight: 'bold', fontSize: 14 },
    skeletonBlock: { backgroundColor: '#D4D0C8' }
});