import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LanguageContext } from '../utils/LanguageContext';

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

export default function MapScreen({ navigation }) {
    const { t, language, formatNumber } = useContext(LanguageContext);

    const [facilities, setFacilities] = useState([]);
    const [userLoc, setUserLoc] = useState(null);
    const [mapRegion, setMapRegion] = useState(null);
    const [filterClosest, setFilterClosest] = useState(false);

    const mapRef = useRef(null);

    useEffect(() => {
        initLocationAndData();
    }, []);

    const initLocationAndData = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        let currentLoc = null;

        if (status === 'granted') {
            currentLoc = await Location.getCurrentPositionAsync({});
            setUserLoc(currentLoc.coords);
            setMapRegion({
                latitude: currentLoc.coords.latitude,
                longitude: currentLoc.coords.longitude,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1
            });
        } else {
            setMapRegion({ latitude: 30.0444, longitude: 31.2357, latitudeDelta: 0.1, longitudeDelta: 0.1 });
        }

        try {
            const token = await SecureStore.getItemAsync('token');
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/facilities?limit=50&offset=0`, {
                headers: { 'Authorization': `Bearer ${token}`,
                 'ngrok-skip-browser-warning': 'true' }
            });
            const data = await response.json();

            let validFacilities = data.filter(f => f.latitude && f.longitude);

            if (currentLoc) {
                validFacilities = validFacilities.map(f => {
                    f.distance = getDistance(
                        currentLoc.coords.latitude, currentLoc.coords.longitude,
                        parseFloat(f.latitude), parseFloat(f.longitude)
                    );
                    return f;
                });
            }
            setFacilities(validFacilities);
        } catch (error) {
            console.error(error);
        }
    };

    const toggleFilter = () => {
        const nextState = !filterClosest;
        setFilterClosest(nextState);

        if (nextState && userLoc) {
            const nearbyCount = facilities.filter(f => f.distance !== undefined && f.distance <= 10).length;

            if (nearbyCount === 0) {
                Alert.alert(t('no_pitches_nearby') || "No pitches nearby", t('no_facilities_10km') || "There are no facilities within 10 km of your current location.");
            } else {
                mapRef.current?.animateToRegion({
                    latitude: userLoc.latitude,
                    longitude: userLoc.longitude,
                    latitudeDelta: 0.04,
                    longitudeDelta: 0.04
                }, 1000);
            }
        }
    };

    const displayedFacilities = filterClosest
        ? facilities.filter(f => f.distance !== undefined && f.distance <= 10)
        : facilities;

    if (!mapRegion) return <ActivityIndicator size="large" color="#E8751A" style={{ flex: 1, justifyContent: 'center' }} />;

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#13294B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('explore_map') || 'Explore Map'}</Text>
            </View>

            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={mapRegion}
                showsUserLocation={true}
            >
                {displayedFacilities.map(f => (
                    <Marker
                        key={f.id}
                        coordinate={{ latitude: parseFloat(f.latitude), longitude: parseFloat(f.longitude) }}
                        pinColor="#E8751A"
                    >
                        <Callout onPress={() => navigation.navigate('FacilityDetails', { facility: f })}>
                            <View style={styles.calloutContainer}>
                                <Text style={styles.calloutTitle}>{f.name}</Text>

                                <View style={styles.calloutTypeBadge}>
                                    <Text style={styles.calloutTypeText}>{f.type ? (t(f.type.toLowerCase()) || f.type.toUpperCase()) : 'GENERAL'}</Text>
                                </View>

                                <Text style={styles.calloutPrice}>{f.price_per_hour} EGP</Text>

                                {f.distance !== undefined && f.distance !== Infinity && (
                                    <Text style={styles.calloutDistance}>{f.distance.toFixed(1)} {t('km_away') || 'km away'}</Text>
                                )}

                                <Text style={styles.calloutTap}>{t('tap_to_view') || 'Tap to view'}</Text>
                            </View>
                        </Callout>
                    </Marker>
                ))}
            </MapView>

            <View style={styles.filterFloating}>
                <TouchableOpacity
                    style={[styles.filterBtn, filterClosest && styles.filterBtnActive]}
                    onPress={toggleFilter}
                >
                    <Ionicons name="location" size={16} color={filterClosest ? "#FFF" : "#13294B"} />
                    <Text style={[styles.filterText, filterClosest && styles.filterTextActive]}>{t('sort_closest') || 'Closest to Me'}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFF' },
    header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, backgroundColor: '#FFF', zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3 },
    backBtn: { marginEnd: 15 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#13294B' }, // Removed textAlign: 'left'
    map: { flex: 1 },
    calloutContainer: { width: 140, padding: 5, alignItems: 'center' },
    calloutTitle: { fontWeight: 'bold', fontSize: 14, color: '#13294B', textAlign: 'center', marginBottom: 4 },
    calloutTypeBadge: { backgroundColor: '#13294B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 },
    calloutTypeText: { fontSize: 9, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
    calloutPrice: { fontWeight: '800', color: '#E8751A', fontSize: 12, marginBottom: 2 },
    calloutDistance: { fontSize: 10, color: '#555', marginBottom: 4 },
    calloutTap: { fontSize: 10, color: '#1565C0', fontWeight: 'bold' },
    filterFloating: { position: 'absolute', bottom: 30, alignSelf: 'center' },
    filterBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5, borderWidth: 1, borderColor: '#D4D0C8' },
    filterBtnActive: { backgroundColor: '#E8751A', borderColor: '#E8751A' },
    filterText: { fontSize: 14, fontWeight: '800', color: '#13294B', marginStart: 6 },
    filterTextActive: { color: '#FFF' }
});