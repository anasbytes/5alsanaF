import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SearchScreen({ navigation }) {
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [sortBy, setSortBy] = useState('default');

    const categories = ['All', 'Football', 'Basketball', 'Padel', 'Ping Pong', 'Playstation'];
    const sortOptions = ['default', 'price_asc', 'price_desc'];
    const sortLabels = { default: 'Default', price_asc: 'Lowest Price', price_desc: 'Highest Price' };

    useEffect(() => {
        fetchFacilities();
    }, []);

    const fetchFacilities = async () => {
        try {
            const response = await fetch('https://freeway-chest-calzone.ngrok-free.dev/facilities', {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            const data = await response.json();
            setFacilities(data);
        } catch (error) {
            console.error('Error fetching facilities:', error);
        } finally {
            setLoading(false);
        }
    };

    const getFilteredFacilities = () => {
        let result = facilities.filter(f => {
            const matchesName = f.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = activeCategory === 'All' || f.type.toLowerCase() === activeCategory.toLowerCase();
            return matchesName && matchesCategory;
        });

        if (sortBy === 'price_asc') result.sort((a, b) => a.price_per_hour - b.price_per_hour);
        if (sortBy === 'price_desc') result.sort((a, b) => b.price_per_hour - a.price_per_hour);

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
                <Text style={styles.cardPrice}>{item.price_per_hour} <Text style={{fontSize: 11}}>EGP</Text></Text>
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
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Discover</Text>
                <Text style={styles.headerSubText}>Find the perfect place to play</Text>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search facilities..."
                        placeholderTextColor="#A0A0A0"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
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
                keyExtractor={(item) => item}
                style={{ flexGrow: 0, flexShrink: 0 }} 
                contentContainerStyle={styles.categoriesContainer}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.categoryBadge, activeCategory === item && styles.activeCategoryBadge]}
                        onPress={() => setActiveCategory(item)}
                    >
                        <Text style={[styles.categoryText, activeCategory === item && styles.activeCategoryText]}>{item}</Text>
                    </TouchableOpacity>
                )}
            />

            <View style={styles.sortContainer}>
                <Ionicons name="filter" size={14} color="#13294B" style={{marginRight: 6}}/>
                {sortOptions.map(option => (
                    <TouchableOpacity
                        key={option}
                        style={[styles.sortButton, sortBy === option && styles.activeSortButton]}
                        onPress={() => setSortBy(option)}
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
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="search-outline" size={50} color="#D0D0D0" />
                            <Text style={styles.emptyText}>No facilities match your search.</Text>
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
    
    // Search Bar - Crisper edges, visible structure
    searchContainer: { paddingHorizontal: 20, marginBottom: 15 },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        height: 48,
        borderRadius: 10, // Sharper than 14
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: '#D4D0C8', // Slightly more visible than before
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04, // Very subtle, hard shadow
        shadowRadius: 2,
        elevation: 1,
    },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, fontSize: 15, color: '#13294B', height: '100%', fontWeight: '500' },
    clearButton: { padding: 4 },
    
    // Categories - Tag style instead of bubbles
    categoriesContainer: { paddingLeft: 20, paddingBottom: 10, paddingRight: 20 },
    categoryBadge: {
        paddingHorizontal: 16, 
        height: 38, 
        borderRadius: 10, // Crisper tag look
        backgroundColor: '#FFFFFF', 
        marginRight: 10, 
        borderWidth: 1, 
        borderColor: '#D4D0C8', // Defined edge
        justifyContent: 'center', 
        alignItems: 'center',
    },
    activeCategoryBadge: { backgroundColor: '#13294B', borderColor: '#13294B' }, // Solid navy for active
    categoryText: { fontSize: 13, fontWeight: '700', color: '#888888' },
    activeCategoryText: { color: '#FFFFFF' },
    
    // Sort Options
    sortContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15, gap: 8, flexWrap: 'wrap' },
    sortButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#D4D0C8' },
    activeSortButton: { backgroundColor: '#E0DDD6', borderColor: '#D4D0C8' },
    sortText: { fontSize: 12, fontWeight: '700', color: '#888888' },
    activeSortText: { color: '#13294B' },
    
    // Cards - Structured and planted
    listContainer: { paddingHorizontal: 20, paddingBottom: 20 },
    card: { 
        backgroundColor: '#FFFFFF', 
        borderRadius: 12, // Sharp but not totally square
        borderWidth: 1, 
        borderColor: '#D4D0C8', // Crisp outline
        padding: 16, 
        marginBottom: 14, 
        shadowColor: '#13294B', 
        shadowOffset: { width: 0, height: 2 }, // Tighter shadow offset
        shadowOpacity: 0.06, // Less blur, more structure
        shadowRadius: 3, 
        elevation: 2 
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    titleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
    iconSquare: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#FFF3E8', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: 'rgba(232, 117, 26, 0.1)' },
    cardTitle: { fontSize: 16, fontWeight: '800', color: '#13294B', flexShrink: 1, letterSpacing: 0.2 },
    cardPrice: { fontSize: 16, fontWeight: '800', color: '#E8751A' },
    
    // Body Elements
    cardBody: { flexDirection: 'row', alignItems: 'center' },
    badge: { backgroundColor: '#13294B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }, // Very sharp inner badge
    badgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
    locationContainer: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginLeft: 10 },
    cardLocation: { fontSize: 13, color: '#555555', marginLeft: 4, flexShrink: 1, fontWeight: '600' },
    
    // Empty State
    emptyContainer: { alignItems: 'center', marginTop: 60 },
    emptyText: { textAlign: 'center', marginTop: 15, fontSize: 15, color: '#888888', fontWeight: '600' },
});