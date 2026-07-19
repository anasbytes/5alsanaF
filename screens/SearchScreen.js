import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { AuthContext } from '../utils/AuthContext';
import { LanguageContext } from '../utils/LanguageContext';
import NetInfo from '@react-native-community/netinfo';

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

export default function SearchScreen({ navigation }) {
    const { signOut } = useContext(AuthContext);
    const { t, language, formatNumber } = useContext(LanguageContext);
    const isRTL = language === 'ar';

    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [sortBy, setSortBy] = useState('default');

    const [userCoords, setUserCoords] = useState(null);

    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const categories = [
        { value: 'All', labelKey: 'type_all' },
        { value: 'Football', labelKey: 'type_football' },
        { value: 'Basketball', labelKey: 'type_basketball' },
        { value: 'Padel', labelKey: 'type_padel' },
        { value: 'Ping Pong', labelKey: 'type_ping_pong' },
        { value: 'Playstation', labelKey: 'type_playstation' },
    ];

    const sortOptions = ['default', 'closest', 'price_asc', 'price_desc'];
    const sortLabels = {
        default: t('sort_default'),
        closest: t('closest_to_me'),
        price_asc: t('lowest_price'),
        price_desc: t('highest_price')
    };

    useEffect(() => {
        const controller = new AbortController();
        fetchFacilities(0, controller.signal);
        fetchUserLocation();
        return () => controller.abort();
    }, []);

    const fetchUserLocation = async () => {
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                let location = await Location.getCurrentPositionAsync({});
                setUserCoords({ latitude: location.coords.latitude, longitude: location.coords.longitude });
            }
        } catch (error) {
            console.log("Could not get location for search screen", error);
        }
    };

    const fetchFacilities = async (pageNumber, signal) => {
        // EARLY EXIT: Prevent infinite loops if there is no internet connection
        const networkState = await NetInfo.fetch();
        if (!networkState.isConnected) {
            setLoading(false);
            setLoadingMore(false);
            return; 
        }

        try {
            const token = await SecureStore.getItemAsync('token');
            const limit = 10;
            const offset = pageNumber * limit;

            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/facilities?limit=${limit}&offset=${offset}`, {
                signal,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'ngrok-skip-browser-warning': 'true'
                }
            });

            if (response.status === 401 || response.status === 403) {
                await signOut();
                return;
            }

            if (!response.ok) throw new Error(`Server returned ${response.status}`);

            const data = await response.json();

            if (data.length < limit) setHasMore(false);

            if (pageNumber === 0) setFacilities(data);
            else setFacilities(prev => [...prev, ...data]);

        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error('Error fetching facilities:', error);
            Alert.alert(t('connection_error_title') || 'Error', t('connection_error_message') || 'Could not load facilities.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const loadMoreFacilities = () => {
        if (!loadingMore && hasMore) {
            setLoadingMore(true);
            const nextPage = page + 1;
            setPage(nextPage);
            fetchFacilities(nextPage);
        }
    };

    const getFilteredFacilities = () => {
        let result = facilities.filter(f => {
            const matchesName = f.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesLocation = f.location.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = activeCategory === 'All' || f.type.toLowerCase() === activeCategory.toLowerCase();
            return (matchesName || matchesLocation) && matchesCategory;
        });

        if (userCoords) {
            result = result.map(f => {
                const dist = getDistance(
                    userCoords.latitude, userCoords.longitude,
                    parseFloat(f.latitude), parseFloat(f.longitude)
                );
                return { ...f, distance: dist };
            });
        }

        if (sortBy === 'price_asc') result.sort((a, b) => parseFloat(a.price_per_hour) - parseFloat(b.price_per_hour));
        if (sortBy === 'price_desc') result.sort((a, b) => parseFloat(b.price_per_hour) - parseFloat(a.price_per_hour));
        if (sortBy === 'closest' && userCoords) result.sort((a, b) => a.distance - b.distance);

        return result;
    };

    const filteredFacilities = getFilteredFacilities();

    const getTypeIcon = (facilityType) => {
        switch (facilityType.toLowerCase()) {
            case 'football': return 'football';
            case 'basketball': return 'basketball';
            case 'padel': return 'tennisball';
            case 'ping pong': return 'tennisball-outline';
            case 'playstation': return 'game-controller';
            default: return 'trophy';
        }
    };

    const renderFacility = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Home', { screen: 'FacilityDetails', params: { facility: item } })}
        >
            <View style={styles.cardHeader}>
                <View style={styles.titleContainer}>
                    <View style={styles.iconSquare}>
                        <Ionicons name={getTypeIcon(item.type)} size={16} color="#E8751A" />
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                </View>
                <Text style={styles.cardPrice}>{formatNumber(item.price_per_hour)} <Text style={{ fontSize: 11 }}>{t('egp') || 'EGP'}</Text></Text>
            </View>

            <View style={styles.cardBody}>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{t(item.type.toLowerCase()) || item.type.toUpperCase()}</Text>
                </View>

                {/* 🌐 Prevent Infinity from rendering */}
                {item.distance !== undefined && item.distance !== Infinity && (
                    <View style={styles.distanceBadge}>
                        <Ionicons name="navigate" size={10} color="#1565C0" />
                        <Text style={styles.distanceText}>{formatNumber(item.distance.toFixed(1))} {t('km_short')}</Text>
                    </View>
                )}

                <View style={styles.locationContainer}>
                    <Ionicons name="location" size={14} color="#888" />
                    <Text style={styles.cardLocation} numberOfLines={1}>{item.location}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('discover')}</Text>
                <Text style={styles.headerSubText}>{t('find_perfect_place')}</Text>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
                    {/* 🌐 TextInput keeps explicit alignment for Android RTL typing */}
                    <TextInput
                        style={[styles.searchInput, { textAlign: isRTL ? 'right' : 'left' }]}
                        placeholder={t('search_placeholder')}
                        placeholderTextColor="#A0A0A0"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        clearButtonMode="always"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity style={styles.clearButton} onPress={() => setSearchQuery('')}>
                            <Ionicons name="close" size={20} color="#888" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={categories}
                keyExtractor={(item) => item.value}
                style={{ flexGrow: 0, flexShrink: 0 }}
                contentContainerStyle={styles.categoriesContainer}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.categoryBadge, activeCategory === item.value && styles.activeCategoryBadge]}
                        onPress={() => setActiveCategory(item.value)}
                    >
                        <Text style={[styles.categoryText, activeCategory === item.value && styles.activeCategoryText]}>{t(item.labelKey)}</Text>
                    </TouchableOpacity>
                )}
            />

            <View style={styles.sortContainer}>
                <Ionicons name="filter" size={14} color="#13294B" style={{ marginEnd: 6 }} />
                {sortOptions.map(option => (
                    <TouchableOpacity
                        key={option}
                        style={[styles.sortButton, sortBy === option && styles.activeSortButton]}
                        onPress={() => {
                            if (option === 'closest' && !userCoords) {
                                Alert.alert(t('location_access_required_title') || 'Location Needed', t('location_access_required_message') || 'We need your location to find the closest facilities.');
                                return;
                            }
                            setSortBy(option);
                        }}
                    >
                        <Text style={[styles.sortText, sortBy === option && styles.activeSortText]}>{sortLabels[option]}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#E8751A" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={filteredFacilities}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderFacility}
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    onEndReached={loadMoreFacilities}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="#E8751A" style={{ marginVertical: 20 }} /> : null}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="search-outline" size={50} color="#D0D0D0" />
                            <Text style={styles.emptyText}>{t('no_match_search')}</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F9F6F0' },
    header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
    headerTitle: { fontSize: 28, fontWeight: '800', color: '#13294B' },
    headerSubText: { fontSize: 14, color: '#888888', marginTop: 4 },
    searchContainer: { paddingHorizontal: 20, marginBottom: 15 },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
        height: 48, borderRadius: 10, paddingHorizontal: 15, borderWidth: 1,
        borderColor: '#D4D0C8', shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
    },
    searchIcon: { marginEnd: 10 },
    searchInput: { flex: 1, fontSize: 15, color: '#13294B', height: '100%', fontWeight: '500' },
    clearButton: { padding: 4 },
    categoriesContainer: { paddingStart: 20, paddingBottom: 10, paddingEnd: 20 },
    categoryBadge: {
        paddingHorizontal: 16, height: 38, borderRadius: 10, backgroundColor: '#FFFFFF',
        marginEnd: 10, borderWidth: 1, borderColor: '#D4D0C8', justifyContent: 'center', alignItems: 'center',
    },
    activeCategoryBadge: { backgroundColor: '#13294B', borderColor: '#13294B' },
    categoryText: { fontSize: 13, fontWeight: '700', color: '#888888', textAlign: 'center' },
    activeCategoryText: { color: '#FFFFFF' },
    sortContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15, gap: 8, flexWrap: 'wrap' },
    sortButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#D4D0C8' },
    activeSortButton: { backgroundColor: '#E0DDD6', borderColor: '#D4D0C8' },
    sortText: { fontSize: 12, fontWeight: '700', color: '#888888' },
    activeSortText: { color: '#13294B' },
    listContainer: { paddingHorizontal: 20, paddingBottom: 20 },
    card: {
        backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#D4D0C8',
        padding: 16, marginBottom: 14, shadowColor: '#13294B', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 3, elevation: 2
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    titleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginEnd: 10 },
    iconSquare: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#FFF3E8', justifyContent: 'center', alignItems: 'center', marginEnd: 12, borderWidth: 1, borderColor: 'rgba(232, 117, 26, 0.1)' },
    cardTitle: { fontSize: 16, fontWeight: '800', color: '#13294B', flexShrink: 1, letterSpacing: 0.2 },
    cardPrice: { fontSize: 16, fontWeight: '800', color: '#E8751A' },
    cardBody: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
    badge: { backgroundColor: '#13294B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 4 },
    badgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5, textAlign: 'center' },
    distanceBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginStart: 8, marginBottom: 4 },
    distanceText: { fontSize: 10, fontWeight: '800', color: '#1565C0', marginStart: 3 },
    locationContainer: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginStart: 10, marginBottom: 4 },
    cardLocation: { fontSize: 13, color: '#555555', marginStart: 4, flexShrink: 1, fontWeight: '600' },
    emptyContainer: { alignItems: 'center', marginTop: 60 },
    emptyText: { textAlign: 'center', marginTop: 15, fontSize: 15, color: '#888888', fontWeight: '600' },
});