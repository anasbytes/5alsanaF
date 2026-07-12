import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, Image, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../utils/AuthContext';

const CATEGORIES = ['All', 'Football', 'Padel', 'Ping Pong', 'Basketball', 'Playstation'];

export default function HomeScreen({ navigation }) {
    const { signOut } = useContext(AuthContext);

    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeCategory, setActiveCategory] = useState('All');

    useEffect(() => {
        fetchFacilities();
    }, []);

    const fetchFacilities = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch('https://freeway-chest-calzone.ngrok-free.dev/facilities', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'ngrok-skip-browser-warning': 'true'
                }
            });

            if (response.status === 401 || response.status === 403) {
                await signOut();
                return;
            }

            if (response.ok) {
                const data = await response.json();
                setFacilities(data);
            }
        }
        catch (error) {
            console.error('Error fetching facilities: ', error);
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchFacilities();
    };

    const filteredFacilities = facilities.filter(facility => {
        if (activeCategory === 'All') return true;
        return facility.type.toLowerCase() === activeCategory.toLowerCase();
    });

    const renderFacility = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('FacilityDetails', { facility: item })}
        >
            <Image
                source={{ uri: item.image_url || 'https://via.placeholder.com/400x200.png?text=No+Image' }}
                style={styles.cardImage}
            />

            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.cardPrice}>{item.price_per_hour} <Text style={{ fontSize: 11 }}>EGP</Text></Text>
                </View>
                <View style={styles.cardBody}>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.type.toUpperCase()}</Text>
                    </View>
                    <View style={styles.locationContainer}>
                        <Ionicons name="location" size={14} color="#888" />
                        <Text style={styles.cardLocation} numberOfLines={1}>{item.location}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <Text style={styles.headerSubText}>Your Location</Text>
                <View style={styles.locationRow}>
                    <Text style={styles.headerTitle}>Cairo, Egypt</Text>
                    <Ionicons name="chevron-down" size={20} color="#13294B" style={{ marginTop: 4, marginLeft: 4 }} />
                </View>
            </View>

            <View style={styles.categoriesContainer}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={CATEGORIES}
                    keyExtractor={(item) => item}
                    style={{ flexGrow: 0, flexShrink: 0 }}
                    contentContainerStyle={{ paddingRight: 20 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.categoryBadge,
                                activeCategory === item && styles.activeCategoryBadge
                            ]}
                            onPress={() => setActiveCategory(item)}
                        >
                            <Text style={[
                                styles.categoryText,
                                activeCategory === item && styles.activeCategoryText
                            ]}>
                                {item}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
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
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="business-outline" size={50} color="#D0D0D0" />
                            <Text style={styles.emptyText}>No facilities found in this category.</Text>
                        </View>
                    }
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8751A" />
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F9F6F0' },
    header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
    headerSubText: { fontSize: 13, color: '#888888', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    locationRow: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#13294B', marginTop: 4 },
    categoriesContainer: { paddingLeft: 20, marginBottom: 15 },
    categoryBadge: {
        paddingHorizontal: 16,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#D4D0C8',
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeCategoryBadge: { backgroundColor: '#13294B', borderColor: '#13294B' },
    categoryText: { fontSize: 13, fontWeight: '700', color: '#888888' },
    activeCategoryText: { color: '#FFFFFF' },
    listContainer: { paddingHorizontal: 20, paddingBottom: 20 },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#D4D0C8',
        marginBottom: 16,
        shadowColor: '#13294B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
        overflow: 'hidden',
    },
    cardImage: {
        width: '100%',
        height: 160,
        resizeMode: 'cover',
        borderBottomWidth: 1,
        borderColor: '#EAE6DF',
    },
    cardContent: { padding: 16 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    cardTitle: { fontSize: 18, fontWeight: '800', color: '#13294B', flex: 1, marginRight: 10, letterSpacing: 0.2 },
    cardPrice: { fontSize: 16, fontWeight: '800', color: '#E8751A' },
    cardBody: { flexDirection: 'row', alignItems: 'center' },
    badge: { backgroundColor: '#E8751A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
    locationContainer: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginLeft: 10 },
    cardLocation: { fontSize: 13, color: '#555555', marginLeft: 4, flexShrink: 1, fontWeight: '600' },
    emptyContainer: { alignItems: 'center', marginTop: 60 },
    emptyText: { textAlign: 'center', marginTop: 15, fontSize: 15, color: '#888888', fontWeight: '600' }
});