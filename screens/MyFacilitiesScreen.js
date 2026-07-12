import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Alert, Modal, TextInput, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../utils/AuthContext';

const BACKEND_URL = 'https://freeway-chest-calzone.ngrok-free.dev';
const FACILITY_TYPES = ['Football', 'Basketball', 'Padel', 'Ping Pong', 'Playstation'];

export default function MyFacilitiesScreen() {
    const { signOut } = useContext(AuthContext);

    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingFacility, setEditingFacility] = useState(null);

    const [name, setName] = useState('');
    const [type, setType] = useState('Football');
    const [location, setLocation] = useState('');
    const [price, setPrice] = useState('');
    const [imageUrl, setImageUrl] = useState('');

    const fetchFacilities = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/facilities/owner/me`, {
                headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
            });

            if (response.status === 401 || response.status === 403) {
                await signOut();
                return;
            }

            const data = await response.json();
            if (response.ok) setFacilities(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [signOut]);

    useEffect(() => { fetchFacilities(); }, [fetchFacilities]);

    const resetForm = () => {
        setName(''); setType('Football'); setLocation(''); setPrice(''); setImageUrl('');
        setEditingFacility(null);
    };

    const openAddModal = () => {
        resetForm();
        setModalVisible(true);
    };

    const openEditModal = (facility) => {
        setEditingFacility(facility);
        setName(facility.name);
        const matchedType = FACILITY_TYPES.find(t => t.toLowerCase() === facility.type.toLowerCase()) || 'Football';
        setType(matchedType);
        setLocation(facility.location);
        setPrice(facility.price_per_hour.toString());
        setImageUrl(facility.image_url || '');
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!name.trim() || !location.trim() || !price.trim()) {
            Alert.alert('Missing Info', 'Please fill out the facility name, location, and price.');
            return;
        }

        const numericPrice = parseFloat(price.replace(/,/g, '').trim());
        if (isNaN(numericPrice) || numericPrice < 0) {
            Alert.alert('Invalid Price', 'Please enter a valid number for the price.');
            return;
        }

        setIsSubmitting(true);

        try {
            const token = await AsyncStorage.getItem('token');
            const method = editingFacility ? 'PUT' : 'POST';
            const url = editingFacility
                ? `${BACKEND_URL}/facilities/${editingFacility.id}`
                : `${BACKEND_URL}/facilities`;

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    name: name.trim(),
                    type: type.toLowerCase(),
                    location: location.trim(),
                    price_per_hour: numericPrice,
                    image_url: imageUrl.trim()
                })
            });

            if (response.status === 401 || response.status === 403) {
                setModalVisible(false);
                await signOut();
                return;
            }

            if (response.ok) {
                setModalVisible(false);
                resetForm();
                fetchFacilities();
            } else {
                const data = await response.json();
                Alert.alert('Error', data.error || 'Something went wrong.');
            }
        } catch (err) {
            console.error(err);
            Alert.alert('Network Error', 'Please check your connection.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = (facility) => {
        Alert.alert('Delete Facility', `Are you sure you want to permanently delete "${facility.name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        const token = await AsyncStorage.getItem('token');
                        const response = await fetch(`${BACKEND_URL}/facilities/${facility.id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
                        });

                        if (response.status === 401 || response.status === 403) {
                            await signOut();
                            return;
                        }

                        if (response.ok) {
                            fetchFacilities();
                        } else {
                            Alert.alert('Error', 'Failed to delete facility.');
                        }
                    } catch (err) {
                        console.error(err);
                        Alert.alert('Network Error', 'Please check your connection.');
                    }
                }
            }
        ]);
    };

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
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.titleContainer}>
                    <View style={styles.iconSquare}>
                        <Ionicons name={getTypeIcon(item.type)} size={16} color="#E8751A" />
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                </View>
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

            <View style={styles.divider} />

            <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(item)}>
                    <Ionicons name="pencil" size={16} color="#13294B" />
                    <Text style={styles.actionBtnText}>Edit Details</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                    <Ionicons name="trash-outline" size={18} color="#D32F2F" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                    <Text style={styles.addButtonText}>Add Facility</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#E8751A" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={facilities}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderFacility}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="business-outline" size={60} color="#D0D0D0" />
                            <Text style={styles.emptyText}>No facilities listed yet.</Text>
                            <Text style={styles.emptySubText}>Tap 'Add Facility' to start accepting bookings.</Text>
                        </View>
                    }
                />
            )}

            <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingFacility ? 'Edit Facility' : 'New Facility'}</Text>
                            <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#888" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <Text style={styles.label}>Facility Name</Text>
                            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Gezira Football Pitch" placeholderTextColor="#A0A0A0" />

                            <Text style={styles.label}>Facility Type</Text>
                            <View style={styles.typeContainer}>
                                {FACILITY_TYPES.map(t => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[styles.typeBadge, type === t && styles.activeTypeBadge]}
                                        onPress={() => setType(t)}
                                    >
                                        <Text style={[styles.typeText, type === t && styles.activeTypeText]}>{t}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Location</Text>
                            <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="e.g. Zamalek, Cairo" placeholderTextColor="#A0A0A0" />

                            <Text style={styles.label}>Price per Hour (EGP)</Text>
                            <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="e.g. 250" placeholderTextColor="#A0A0A0" />

                            <Text style={styles.label}>Image URL (Optional)</Text>
                            <TextInput style={styles.input} value={imageUrl} onChangeText={setImageUrl} placeholder="https://..." autoCapitalize="none" placeholderTextColor="#A0A0A0" />

                            <TouchableOpacity
                                style={[styles.saveButton, isSubmitting && { opacity: 0.7 }]}
                                onPress={handleSave}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.saveButtonText}>{editingFacility ? 'Save Changes' : 'Create Facility'}</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F9F6F0' },
    header: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 20, paddingTop: 15, paddingBottom: 10 },
    addButton: { backgroundColor: '#13294B', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#13294B' },
    addButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14, marginLeft: 4 },
    listContainer: { paddingHorizontal: 20, paddingBottom: 30 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: '#D4D0C8', shadowColor: '#13294B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    titleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
    iconSquare: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#FFF3E8', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: 'rgba(232, 117, 26, 0.1)' },
    cardTitle: { fontSize: 16, fontWeight: '800', color: '#13294B', flexShrink: 1, letterSpacing: 0.2 },
    cardPrice: { fontSize: 16, fontWeight: '800', color: '#E8751A' },
    cardBody: { flexDirection: 'row', alignItems: 'center' },
    badge: { backgroundColor: '#13294B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
    locationContainer: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginLeft: 10 },
    cardLocation: { fontSize: 13, color: '#555555', marginLeft: 4, flexShrink: 1, fontWeight: '600' },
    divider: { height: 1, backgroundColor: '#EAE6DF', marginVertical: 15 },
    cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F4F8', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, flex: 1, marginRight: 10, justifyContent: 'center', borderWidth: 1, borderColor: '#D4D0C8' },
    actionBtnText: { color: '#13294B', fontWeight: '800', fontSize: 13, marginLeft: 6 },
    deleteBtn: { backgroundColor: '#FFEBEE', width: 42, height: 42, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(211, 47, 47, 0.2)' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
    emptyText: { fontSize: 18, fontWeight: '800', color: '#13294B', marginTop: 15 },
    emptySubText: { fontSize: 14, color: '#888888', marginTop: 5, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(19, 41, 75, 0.4)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 25, paddingBottom: 40, height: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: '900', color: '#13294B', letterSpacing: -0.5 },
    closeBtn: { padding: 4, backgroundColor: '#F5F5F5', borderRadius: 8 },
    label: { fontSize: 12, fontWeight: '800', color: '#888888', marginBottom: 8, marginTop: 15, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { backgroundColor: '#F9F6F0', borderRadius: 10, borderWidth: 1, borderColor: '#D4D0C8', paddingHorizontal: 15, paddingVertical: 14, fontSize: 15, color: '#13294B', fontWeight: '600' },
    typeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    typeBadge: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#F9F6F0', borderWidth: 1, borderColor: '#D4D0C8' },
    activeTypeBadge: { backgroundColor: '#13294B', borderColor: '#13294B' },
    typeText: { fontSize: 13, fontWeight: '800', color: '#888888' },
    activeTypeText: { color: '#FFFFFF' },
    saveButton: { backgroundColor: '#E8751A', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 30, borderWidth: 1, borderColor: '#E8751A' },
    saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
});