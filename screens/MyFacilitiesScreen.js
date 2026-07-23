import React, { useState, useCallback, useContext, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, ScrollView, Image, RefreshControl } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../utils/AuthContext';
import { LanguageContext } from '../utils/LanguageContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL;

const FACILITY_TYPES = [
    { value: 'Football', labelKey: 'type_football' },
    { value: 'Basketball', labelKey: 'type_basketball' },
    { value: 'Padel', labelKey: 'type_padel' },
    { value: 'Ping Pong', labelKey: 'type_ping_pong' },
    { value: 'Playstation', labelKey: 'type_playstation' },
];

export default function MyFacilitiesScreen() {
    const { signOut } = useContext(AuthContext);
    const { t, language, formatNumber } = useContext(LanguageContext);
    const isRTL = language === 'ar';

    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingFacility, setEditingFacility] = useState(null);
    const [roomModalVisible, setRoomModalVisible] = useState(false);
    const [managingFacility, setManagingFacility] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [roomName, setRoomName] = useState('');
    const [roomPrice, setRoomPrice] = useState('');
    const [editingRoom, setEditingRoom] = useState(null);
    const [roomSubmitting, setRoomSubmitting] = useState(false);


    const [name, setName] = useState('');
    const [type, setType] = useState('Football');
    const [location, setLocation] = useState('');
    const [price, setPrice] = useState('');
    const [images, setImages] = useState([]);
    const [description, setDescription] = useState('');

    const [isMapPickerVisible, setIsMapPickerVisible] = useState(false);
    const [pinCoords, setPinCoords] = useState(null);

    const mapRef = useRef(null);

    useFocusEffect(
        useCallback(() => {
            fetchFacilities();
        }, [])
    );

    const fetchFacilities = async (isRefresh = false) => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const response = await fetch(`${BACKEND_URL}/facilities/owner/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'ngrok-skip-browser-warning': 'true'
                }
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
            if (isRefresh) setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchFacilities(true);
    };

    const resetForm = () => {
        setName(''); setType('Football'); setLocation(''); setPrice(''); setImages([]);
        setDescription('');
        setPinCoords(null);
        setEditingFacility(null);
    };

    const openAddModal = async () => {
        resetForm();
        setModalVisible(true);

        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
            let currentLoc = await Location.getCurrentPositionAsync({});
            setPinCoords({ latitude: currentLoc.coords.latitude, longitude: currentLoc.coords.longitude });
        }
    };

    const openEditModal = (facility) => {
        setEditingFacility(facility);
        setName(facility.name);
        const matchedType = FACILITY_TYPES.find(ft => ft.value.toLowerCase() === facility.type.toLowerCase())?.value || 'Football';
        setType(matchedType);
        setLocation(facility.location);
        setPrice(facility.price_per_hour.toString());
        setImages(facility.images || []);
        setDescription(facility.description || '');

        if (facility.latitude && facility.longitude) {
            setPinCoords({ latitude: parseFloat(facility.latitude), longitude: parseFloat(facility.longitude) });
        } else {
            setPinCoords(null);
        }

        setModalVisible(true);
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            const uris = result.assets.map(a => a.uri);
            setImages(prev => [...prev, ...uris]);
        }
    };

    const handleSnapToCurrentLocation = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(t('permission_denied'), t('need_location_access'));
            return;
        }

        let currentLoc = await Location.getCurrentPositionAsync({});
        const newCoords = {
            latitude: currentLoc.coords.latitude,
            longitude: currentLoc.coords.longitude,
        };

        setPinCoords(newCoords);

        mapRef.current?.animateToRegion({
            ...newCoords,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05
        }, 1000);
    };

    const handleConfirmPin = async () => {
        setIsMapPickerVisible(false);
        if (pinCoords) {
            try {
                const geocode = await Location.reverseGeocodeAsync(pinCoords);
                if (geocode.length > 0) {
                    const place = geocode[0];
                    const addressParts = [place.street, place.subregion, place.city].filter(Boolean);
                    setLocation(addressParts.join(', '));
                }
            } catch (e) {
                console.log('Reverse geocode failed', e);
            }
        }
    };

    const handleSave = async () => {
        if (!name.trim() || !location.trim() || !price.trim()) {
            Alert.alert(t('missing_info'), t('fill_required_fields'));
            return;
        }

        if (!pinCoords) {
            Alert.alert(t('missing_location'), t('pick_on_map_hint'));
            return;
        }

        const numericPrice = parseFloat(price.replace(/,/g, '').trim());
        if (isNaN(numericPrice) || numericPrice < 0) {
            Alert.alert(t('invalid_price'), t('invalid_price_message'));
            return;
        }

        setIsSubmitting(true);

        try {
            const token = await SecureStore.getItemAsync('token');
            const method = editingFacility ? 'PUT' : 'POST';
            const url = editingFacility
                ? `${BACKEND_URL}/facilities/${editingFacility.id}`
                : `${BACKEND_URL}/facilities`;

            const formData = new FormData();
            formData.append('name', name.trim());
            formData.append('type', type.toLowerCase());
            formData.append('location', location.trim());
            formData.append('price_per_hour', numericPrice);
            formData.append('description', description.trim());
            formData.append('latitude', pinCoords.latitude);
            formData.append('longitude', pinCoords.longitude);

            for (const uri of images) {
                if (!uri.startsWith('http')) {
                    let filename = uri.split('/').pop();
                    let match = /\.(\w+)$/.exec(filename);
                    let imageType = match ? `image/${match[1]}` : 'image';
                    formData.append('images', { uri, name: filename, type: imageType });
                }
            }
            formData.append('existing_images', JSON.stringify(images.filter(uri => uri.startsWith('http'))));

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'ngrok-skip-browser-warning': 'true'
                },
                body: formData
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
                Alert.alert(t('error_generic'), data.error || t('something_went_wrong'));
            }
        } catch (err) {
            console.error(err);
            Alert.alert(t('network_error'), t('check_connection'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = (facility) => {
        Alert.alert(
            t('delete_facility_title'),
            t('delete_facility_confirm').replace('{name}', facility.name),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('delete'), style: 'destructive',
                    onPress: async () => {
                        try {
                            const token = await SecureStore.getItemAsync('token');
                            const response = await fetch(`${BACKEND_URL}/facilities/${facility.id}`, {
                                method: 'DELETE',
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
                                fetchFacilities();
                            } else {
                                Alert.alert(t('error_generic') || 'Error', t('something_went_wrong') || 'Failed to delete facility.');
                            }
                        } catch (err) {
                            Alert.alert(t('network_error'), t('check_connection'));
                        }
                    }
                }
            ]
        );
    };

    const fetchRooms = async (facilityId) => {
        try {
            const res = await fetch(`${BACKEND_URL}/rooms/facility/${facilityId}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            if (res.ok) setRooms(await res.json());
        } catch (e) { console.error(e); }
    };

    const openRoomModal = (facility) => {
        setManagingFacility(facility);
        setRooms([]);
        setRoomName(''); setRoomPrice(''); setEditingRoom(null);
        fetchRooms(facility.id);
        setRoomModalVisible(true);
    };

    const handleSaveRoom = async () => {
        if (!roomName.trim() || !roomPrice.trim()) return;
        const numericPrice = parseFloat(roomPrice.replace(/,/g, '').trim());
        if (isNaN(numericPrice) || numericPrice < 0) {
            Alert.alert(t('invalid_price'), t('invalid_price_message'));
            return;
        }
        setRoomSubmitting(true);
        try {
            const token = await SecureStore.getItemAsync('token');
            const method = editingRoom ? 'PUT' : 'POST';
            const url = editingRoom ? `${BACKEND_URL}/rooms/${editingRoom.id}` : `${BACKEND_URL}/rooms`;
            const body = editingRoom
                ? { name: roomName.trim(), price_per_hour: numericPrice }
                : { facility_id: managingFacility.id, name: roomName.trim(), price_per_hour: numericPrice };
            const res = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                setRoomName(''); setRoomPrice(''); setEditingRoom(null);
                fetchRooms(managingFacility.id);
            } else {
                const data = await res.json();
                Alert.alert(t('error_generic'), data.error || t('something_went_wrong'));
            }
        } catch (e) { console.error(e); }
        finally { setRoomSubmitting(false); }
    };

    const handleDeleteRoom = (room) => {
        Alert.alert(t('delete') || 'Delete', `Delete room "${room.name}"?`, [
            { text: t('cancel'), style: 'cancel' },
            {
                text: t('delete'), style: 'destructive', onPress: async () => {
                    try {
                        const token = await SecureStore.getItemAsync('token');
                        await fetch(`${BACKEND_URL}/rooms/${room.id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
                        });
                        fetchRooms(managingFacility.id);
                    } catch (e) { console.error(e); }
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
                <Text style={styles.cardPrice}>{formatNumber(item.price_per_hour)} <Text style={{ fontSize: 11 }}>{t('egp') || 'EGP'}</Text></Text>
            </View>

            <View style={styles.cardBody}>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{t(item.type.toLowerCase()) || item.type.toUpperCase()}</Text>
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
                    <Text style={styles.actionBtnText}>{t('edit_details')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F0F4F8', marginEnd: 0 }]} onPress={() => openRoomModal(item)}>
                    <Ionicons name="grid-outline" size={16} color="#13294B" />
                    <Text style={styles.actionBtnText}>{t('manage_rooms') || 'Rooms'}</Text>
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
                    <Text style={styles.addButtonText}>{t('add_facility')}</Text>
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
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8751A" />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="business-outline" size={60} color="#D0D0D0" />
                            <Text style={styles.emptyText}>{t('no_facilities_listed')}</Text>
                            <Text style={styles.emptySubText}>{t('tap_add_facility_hint')}</Text>
                        </View>
                    }
                />
            )}

            <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>

                        {isMapPickerVisible ? (
                            <View style={{ flex: 1 }}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>{t('drop_a_pin')}</Text>
                                    <TouchableOpacity onPress={() => setIsMapPickerVisible(false)} style={styles.closeBtn}>
                                        <Ionicons name="close" size={24} color="#888" />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.mapHintText}>{t('tap_map_hint')}</Text>

                                <View style={styles.mapContainer}>
                                    <MapView
                                        ref={mapRef}
                                        style={{ flex: 1 }}
                                        initialRegion={{
                                            latitude: pinCoords ? pinCoords.latitude : 30.0444,
                                            longitude: pinCoords ? pinCoords.longitude : 31.2357,
                                            latitudeDelta: 0.05,
                                            longitudeDelta: 0.05
                                        }}
                                        onPress={(e) => setPinCoords(e.nativeEvent.coordinate)}
                                    >
                                        {pinCoords && <Marker coordinate={pinCoords} pinColor="#E8751A" />}
                                    </MapView>

                                    <TouchableOpacity
                                        style={styles.myLocationBtn}
                                        onPress={handleSnapToCurrentLocation}
                                    >
                                        <Ionicons name="navigate" size={22} color="#13294B" />
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    style={[styles.saveButton, !pinCoords && { opacity: 0.5 }]}
                                    disabled={!pinCoords}
                                    onPress={handleConfirmPin}
                                >
                                    <Text style={styles.saveButtonText}>{t('confirm_location')}</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={{ flex: 1 }}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>{editingFacility ? t('edit_facility') : t('new_facility')}</Text>
                                    <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }} style={styles.closeBtn}>
                                        <Ionicons name="close" size={24} color="#888" />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                                    <Text style={styles.label}>{t('facility_photo')}</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                                        {images.map((uri, index) => (
                                            <View key={index} style={{ position: 'relative', marginEnd: 10 }}>
                                                <Image source={{ uri }} style={styles.previewImage} />
                                                <TouchableOpacity
                                                    style={styles.removeImageBtn}
                                                    onPress={() => setImages(prev => prev.filter((_, i) => i !== index))}
                                                >
                                                    <Ionicons name="close-circle" size={22} color="#DC2626" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                        <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
                                            <View style={styles.imagePlaceholder}>
                                                <Ionicons name="camera" size={32} color="#A0A0A0" />
                                                <Text style={styles.imagePlaceholderText}>{t('upload_a_photo')}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    </ScrollView>

                                    <Text style={styles.label}>{t('facility_name')}</Text>
                                    <TextInput
                                        style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                                        value={name}
                                        onChangeText={setName}
                                        placeholder={t('facility_name_placeholder')}
                                        placeholderTextColor="#A0A0A0"
                                    />

                                    <Text style={styles.label}>{t('facility_type')}</Text>
                                    <View style={styles.typeContainer}>
                                        {FACILITY_TYPES.map(ft => (
                                            <TouchableOpacity
                                                key={ft.value}
                                                style={[styles.typeBadge, type === ft.value && styles.activeTypeBadge]}
                                                onPress={() => setType(ft.value)}
                                            >
                                                <Text style={[styles.typeText, type === ft.value && styles.activeTypeText]}>{t(ft.labelKey)}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <View style={styles.locationHeaderRow}>
                                        <Text style={[styles.label, { marginTop: 0, marginBottom: 0 }]}>{t('location_label')}</Text>
                                        <TouchableOpacity onPress={() => setIsMapPickerVisible(true)} style={styles.pickOnMapBtn}>
                                            <Ionicons name="map" size={14} color="#1565C0" />
                                            <Text style={styles.pickOnMapText}>{t('pick_on_map')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <TextInput
                                        style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                                        value={location}
                                        onChangeText={setLocation}
                                        placeholder={t('location_placeholder')}
                                        placeholderTextColor="#A0A0A0"
                                    />

                                    <Text style={styles.label}>{t('description_optional')}</Text>
                                    <TextInput
                                        style={[styles.input, styles.textArea, { textAlign: isRTL ? 'right' : 'left' }]}
                                        value={description}
                                        onChangeText={setDescription}
                                        placeholder={t('description_placeholder')}
                                        placeholderTextColor="#A0A0A0"
                                        multiline={true}
                                        numberOfLines={4}
                                    />

                                    <Text style={styles.label}>{t('price_per_hour')}</Text>
                                    <TextInput
                                        style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                                        value={price}
                                        onChangeText={setPrice}
                                        keyboardType="numeric"
                                        placeholder={t('price_placeholder')}
                                        placeholderTextColor="#A0A0A0"
                                    />

                                    <TouchableOpacity
                                        style={[styles.saveButton, isSubmitting && { opacity: 0.7 }]}
                                        onPress={handleSave}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <ActivityIndicator color="#FFF" />
                                        ) : (
                                            <Text style={styles.saveButtonText}>{editingFacility ? t('save_changes') : t('create_facility')}</Text>
                                        )}
                                    </TouchableOpacity>
                                </ScrollView>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
            <Modal visible={roomModalVisible} animationType="slide" transparent={true} onRequestClose={() => setRoomModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{managingFacility?.name} — {t('manage_rooms') || 'Rooms'}</Text>
                            <TouchableOpacity onPress={() => setRoomModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#888" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            {rooms.map(room => (
                                <View key={room.id} style={[styles.card, { marginBottom: 10 }]}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View>
                                            <Text style={styles.cardTitle}>{room.name}</Text>
                                            <Text style={{ color: '#E8751A', fontWeight: '800', marginTop: 2 }}>{room.price_per_hour} {t('egp_hr') || 'EGP/hr'}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <TouchableOpacity style={styles.actionBtn} onPress={() => { setEditingRoom(room); setRoomName(room.name); setRoomPrice(room.price_per_hour.toString()); }}>
                                                <Ionicons name="pencil" size={15} color="#13294B" />
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteRoom(room)}>
                                                <Ionicons name="trash-outline" size={15} color="#D32F2F" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            ))}
                            <Text style={styles.label}>{editingRoom ? (t('edit_details') || 'Edit Room') : (t('add_facility') || 'Add Room')}</Text>
                            <TextInput
                                style={[styles.input, { textAlign: isRTL ? 'right' : 'left', marginBottom: 10 }]}
                                value={roomName}
                                onChangeText={setRoomName}
                                placeholder={t('facility_name_placeholder') || 'Room name (e.g. Court 1, VIP Room)'}
                                placeholderTextColor="#A0A0A0"
                            />
                            <TextInput
                                style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                                value={roomPrice}
                                onChangeText={setRoomPrice}
                                keyboardType="numeric"
                                placeholder={t('price_placeholder') || 'Price per hour'}
                                placeholderTextColor="#A0A0A0"
                            />
                            {editingRoom && (
                                <TouchableOpacity onPress={() => { setEditingRoom(null); setRoomName(''); setRoomPrice(''); }} style={{ marginTop: 8, alignItems: 'center' }}>
                                    <Text style={{ color: '#888', fontWeight: '700' }}>{t('cancel') || 'Cancel edit'}</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={[styles.saveButton, (!roomName.trim() || !roomPrice.trim() || roomSubmitting) && { opacity: 0.5 }]}
                                onPress={handleSaveRoom}
                                disabled={!roomName.trim() || !roomPrice.trim() || roomSubmitting}
                            >
                                {roomSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>{editingRoom ? (t('save_changes') || 'Save Changes') : (t('add_facility') || 'Add Room')}</Text>}
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
    addButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14, marginStart: 4 },
    listContainer: { paddingHorizontal: 20, paddingBottom: 30 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: '#D4D0C8', shadowColor: '#13294B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    titleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginEnd: 10 },
    iconSquare: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#FFF3E8', justifyContent: 'center', alignItems: 'center', marginEnd: 12, borderWidth: 1, borderColor: 'rgba(232, 117, 26, 0.1)' },
    cardTitle: { fontSize: 16, fontWeight: '800', color: '#13294B', flexShrink: 1, letterSpacing: 0.2 },
    cardPrice: { fontSize: 16, fontWeight: '800', color: '#E8751A' },
    cardBody: { flexDirection: 'row', alignItems: 'center' },
    badge: { backgroundColor: '#13294B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5, textAlign: 'center' },
    locationContainer: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginStart: 10 },
    cardLocation: { fontSize: 13, color: '#555555', marginStart: 4, flexShrink: 1, fontWeight: '600' },
    divider: { height: 1, backgroundColor: '#EAE6DF', marginVertical: 15 },
    cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F4F8', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, flex: 1, marginEnd: 10, justifyContent: 'center', borderWidth: 1, borderColor: '#D4D0C8' },
    actionBtnText: { color: '#13294B', fontWeight: '800', fontSize: 13, marginStart: 6 },
    deleteBtn: { backgroundColor: '#FFEBEE', width: 42, height: 42, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(211, 47, 47, 0.2)' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
    emptyText: { fontSize: 18, fontWeight: '800', color: '#13294B', marginTop: 15 },
    emptySubText: { fontSize: 14, color: '#888888', marginTop: 5, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(19, 41, 75, 0.4)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 25, paddingBottom: 40, height: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: '900', color: '#13294B', letterSpacing: -0.5 },
    closeBtn: { padding: 4, backgroundColor: '#F5F5F5', borderRadius: 8 },
    label: { fontSize: 12, fontWeight: '800', color: '#888888', marginBottom: 8, marginTop: 15, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { backgroundColor: '#F9F6F0', borderRadius: 10, borderWidth: 1, borderColor: '#D4D0C8', paddingHorizontal: 15, paddingVertical: 14, fontSize: 15, color: '#13294B', fontWeight: '600' },
    textArea: { height: 100, textAlignVertical: 'top', paddingTop: 12 },
    typeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    typeBadge: { paddingHorizontal: 18, minHeight: 40, paddingVertical: 10, borderRadius: 8, backgroundColor: '#F9F6F0', borderWidth: 1, borderColor: '#D4D0C8', justifyContent: 'center', alignItems: 'center' },
    activeTypeBadge: { backgroundColor: '#13294B', borderColor: '#13294B' },
    typeText: { fontSize: 13, fontWeight: '800', color: '#888888' },
    activeTypeText: { color: '#FFFFFF' },
    locationHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 15, marginBottom: 8 },
    pickOnMapBtn: { flexDirection: 'row', alignItems: 'center' },
    pickOnMapText: { color: '#1565C0', fontSize: 13, fontWeight: '800', marginStart: 4 },
    mapHintText: { color: '#555', marginBottom: 15, fontSize: 13 },
    saveButton: { backgroundColor: '#E8751A', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 30, borderWidth: 1, borderColor: '#E8751A', marginBottom: 20 },
    saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
    imagePickerBtn: { width: 140, height: 140, borderRadius: 10, overflow: 'hidden', backgroundColor: '#F9F6F0', borderWidth: 1, borderColor: '#D4D0C8', borderStyle: 'dashed' },
    previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    imagePlaceholderText: { marginTop: 8, color: '#A0A0A0', fontWeight: '600', fontSize: 14 },
    mapContainer: { flex: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#D4D0C8', marginBottom: 15 },
    removeImageBtn: { position: 'absolute', top: 4, end: 4 },
    previewImage: { width: 140, height: 140, borderRadius: 10, resizeMode: 'cover' },
    myLocationBtn: { position: 'absolute', bottom: 20, end: 20, backgroundColor: '#FFFFFF', width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5, borderWidth: 1, borderColor: '#D4D0C8' }
});