import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView, RefreshControl, Image } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { AuthContext } from '../utils/AuthContext';
import { LanguageContext } from '../utils/LanguageContext';
import * as ImagePicker from 'expo-image-picker';

export default function AccountScreen() {
    const { signOut } = useContext(AuthContext);
    const { t, language, formatNumber } = useContext(LanguageContext);

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editing, setEditing] = useState(null);

    const [username, setUsername] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        fetchUser();

        // Auto-Recovery: Listen for the internet to come back and try fetching again
        const unsubscribe = NetInfo.addEventListener(state => {
            if (state.isConnected) {
                fetchUser();
            }
        });

        return () => unsubscribe();
    }, []);

    const fetchUser = async () => {
        const networkState = await NetInfo.fetch();
        if (!networkState.isConnected) {
            setLoading(false);
            setRefreshing(false);
            return;
        }

        try {
            const token = await SecureStore.getItemAsync('token');
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/users/me`, {
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
            if (response.ok) {
                setUser(data);
                setUsername(data.username);
                setPhone(data.phone_number);
            }
        } catch (error) {
            console.error('Error fetching user:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchUser();
    };

    const handleSave = async () => {
        if (editing === 'password') {
            if (password !== confirmPassword) {
                Alert.alert(t('error') || 'Error', t('passwords_not_match') || 'Passwords do not match.');
                return;
            }
            if (password.length < 6) {
                Alert.alert(t('error') || 'Error', t('password_length') || 'Password must be at least 6 characters.');
                return;
            }
        }

        setIsSaving(true);

        try {
            const networkState = await NetInfo.fetch();
            if (!networkState.isConnected) {
                Alert.alert(t('error') || 'Error', t('no_internet') || 'No Internet Connection');
                setIsSaving(false);
                return;
            }

            const token = await SecureStore.getItemAsync('token');

            const body = {};
            if (editing === 'username') body.username = username;
            if (editing === 'phone') body.phone_number = phone;
            if (editing === 'password') body.password = password;

            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/users/me`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify(body)
            });

            if (response.status === 401 || response.status === 403) {
                await signOut();
                return;
            }

            const data = await response.json();

            if (response.ok) {
                setUser(data);
                setEditing(null);
                setPassword('');
                setConfirmPassword('');
                Alert.alert(t('success') || 'Success', t('details_updated') || 'Your details have been updated.');
            } else {
                Alert.alert(t('error') || 'Error', data.error || 'Something went wrong.');
            }
        } catch (error) {
            console.error('Update error:', error);
            Alert.alert(t('error') || 'Error', t('network_error') || 'Network error. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(t('log_out') || 'Log Out', t('logout_confirm') || 'Are you sure you want to log out?', [
            { text: t('cancel') || 'Cancel', style: 'cancel' },
            { text: t('log_out') || 'Log Out', style: 'destructive', onPress: async () => {
    await SecureStore.deleteItemAsync('recent_facilities');
    signOut();
}}
        ]);
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            t('delete_account') || 'Delete Account', 
            t('delete_account_confirm') || 'Are you sure you want to permanently delete your account? This action cannot be undone.', 
            [
                { text: t('cancel') || 'Cancel', style: 'cancel' },
                { 
                    text: t('delete') || 'Delete', 
                    style: 'destructive', 
                    onPress: async () => {
                        try {
                            const networkState = await NetInfo.fetch();
                            if (!networkState.isConnected) {
                                Alert.alert(t('error') || 'Error', t('no_internet') || 'No Internet Connection');
                                return;
                            }

                            const token = await SecureStore.getItemAsync('token');
                            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/users/me`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'ngrok-skip-browser-warning': 'true'
                                }
                            });

                            if (response.ok) {
                                Alert.alert(t('success') || 'Success', t('account_deleted_success') || 'Your account has been deleted.');
                                await signOut();
                            } else {
                                const data = await response.json();
                                Alert.alert(t('error') || 'Error', data.error || 'Failed to delete account.');
                            }
                        } catch (error) {
                            Alert.alert(t('error') || 'Error', t('network_error') || 'Network error.');
                        }
                    }
                }
            ]
        );
    };

    if (loading) return <ActivityIndicator size="large" color="#E8751A" style={{ flex: 1, backgroundColor: '#F9F6F0' }} />;

    const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
    });

    if (!result.canceled) {
        const uri = result.assets[0].uri;
        const filename = uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const imageType = match ? `image/${match[1]}` : 'image';

        const formData = new FormData();
        formData.append('avatar', { uri, name: filename, type: imageType });

        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/users/me`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'ngrok-skip-browser-warning': 'true',
                },
                body: formData,
            });
            if (res.ok) {
                const updated = await res.json();
                setUser(updated);
            } else {
                Alert.alert(t('error_generic'), t('something_went_wrong'));
            }
        } catch (err) {
            console.error(err);
            Alert.alert(t('network_error'), t('check_connection'));
        }
    }
};

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView 
                contentContainerStyle={styles.container} 
                keyboardShouldPersistTaps="handled" 
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8751A" />}
            >
                <Text style={styles.headerTitle}>{t('profile') || 'Profile'}</Text>

                <View style={styles.avatarContainer}>
    <TouchableOpacity onPress={pickAvatar} style={styles.avatarWrapper}>
        {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
        ) : (
            <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                    {user?.username ? user.username.charAt(0).toUpperCase() : '?'}
                </Text>
            </View>
        )}
        <View style={styles.avatarCameraIcon}>
            <Ionicons name="camera" size={14} color="#fff" />
        </View>
    </TouchableOpacity>
    <Text style={styles.welcomeText}>
        {t('hello') || 'Hello'}, {user?.username || 'User'}
    </Text>
    <Text style={styles.roleBadge}>
        {user?.role ? (t(user.role.toLowerCase()) || user.role.toUpperCase()) : 'PLAYER'}
    </Text>
</View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('account_details') || 'Account Details'}</Text>

                    <View style={styles.row}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="person-outline" size={20} color="#13294B" />
                        </View>
                        <View style={styles.rowLeft}>
                            <Text style={styles.rowLabel}>{t('username') || 'Username'}</Text>
                            {editing === 'username' ? (
                                <TextInput 
                                    style={[styles.input, { textAlign: language === 'ar' ? 'right' : 'left' }]} 
                                    value={username} 
                                    onChangeText={setUsername} 
                                    autoCapitalize="none" 
                                    autoFocus 
                                    editable={!isSaving} 
                                />
                            ) : (
                                <Text style={styles.rowValue}>{user?.username || '--'}</Text>
                            )}
                        </View>
                        {editing === 'username' ? (
                            <View style={styles.editActions}>
                                <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={isSaving}>
                                    {isSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="checkmark" size={20} color="#FFF" />}
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setEditing(null)} style={styles.cancelButton} disabled={isSaving}>
                                    <Ionicons name="close" size={20} color="#888" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity onPress={() => setEditing('username')} style={styles.editIconBtn}>
                                <Ionicons name="pencil" size={16} color="#E8751A" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.row}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="call-outline" size={20} color="#13294B" />
                        </View>
                        <View style={styles.rowLeft}>
                            <Text style={styles.rowLabel}>{t('phone_number') || 'Phone Number'}</Text>
                            {editing === 'phone' ? (
                                <TextInput 
                                    style={[styles.input, { textAlign: language === 'ar' ? 'right' : 'left' }]} 
                                    value={phone} 
                                    onChangeText={setPhone} 
                                    keyboardType="phone-pad" 
                                    autoFocus 
                                    editable={!isSaving} 
                                />
                            ) : (
                                <Text style={styles.rowValue}>{user?.phone_number ? formatNumber(user.phone_number) : '--'}</Text>
                            )}
                        </View>
                        {editing === 'phone' ? (
                            <View style={styles.editActions}>
                                <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={isSaving}>
                                    {isSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="checkmark" size={20} color="#FFF" />}
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setEditing(null)} style={styles.cancelButton} disabled={isSaving}>
                                    <Ionicons name="close" size={20} color="#888" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity onPress={() => setEditing('phone')} style={styles.editIconBtn}>
                                <Ionicons name="pencil" size={16} color="#E8751A" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.row}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="lock-closed-outline" size={20} color="#13294B" />
                        </View>
                        <View style={styles.rowLeft}>
                            <Text style={styles.rowLabel}>{t('password') || 'Password'}</Text>
                            {editing === 'password' ? (
                                <View style={{ gap: 10, marginTop: 5 }}>
                                    <TextInput 
                                        style={[styles.input, { textAlign: language === 'ar' ? 'right' : 'left' }]} 
                                        value={password} 
                                        onChangeText={setPassword} 
                                        placeholder={t('new_password') || "New password"} 
                                        secureTextEntry 
                                        autoFocus 
                                        editable={!isSaving} 
                                    />
                                    <TextInput 
                                        style={[styles.input, { textAlign: language === 'ar' ? 'right' : 'left' }]} 
                                        value={confirmPassword} 
                                        onChangeText={setConfirmPassword} 
                                        placeholder={t('confirm_password') || "Confirm password"} 
                                        secureTextEntry 
                                        editable={!isSaving} 
                                    />
                                </View>
                            ) : (
                                <Text style={styles.rowValue}>••••••••</Text>
                            )}
                        </View>
                        {editing === 'password' ? (
                            <View style={styles.editActions}>
                                <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={isSaving}>
                                    {isSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="checkmark" size={20} color="#FFF" />}
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => { setEditing(null); setPassword(''); setConfirmPassword(''); }} style={styles.cancelButton} disabled={isSaving}>
                                    <Ionicons name="close" size={20} color="#888" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity onPress={() => setEditing('password')} style={styles.editIconBtn}>
                                <Ionicons name="pencil" size={16} color="#E8751A" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('settings') || 'Settings'}</Text>
                    
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={20} color="#D32F2F" style={{ marginEnd: 8 }} />
                        <Text style={styles.logoutButtonText}>{t('log_out') || 'Log Out'}</Text>
                    </TouchableOpacity>

                    {/* Change the icon color from #888 to #FFFFFF */}
                    <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
                        <Ionicons name="trash-outline" size={20} color="#FFFFFF" style={{ marginEnd: 8 }} />
                        <Text style={styles.deleteAccountText}>{t('delete_account') || 'Delete Account'}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F9F6F0' },
    container: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
    headerTitle: { fontSize: 28, fontWeight: '800', color: '#13294B', marginBottom: 20 }, 
    avatarContainer: { alignItems: 'center', marginBottom: 30 },
    avatarCircle: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8751A',
        justifyContent: 'center', alignItems: 'center', marginBottom: 12,
        shadowColor: '#E8751A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 4
    },
    avatarText: { fontSize: 32, fontWeight: '800', color: '#FFFFFF' },
    welcomeText: { fontSize: 20, fontWeight: '800', color: '#13294B', marginBottom: 6 },
    roleBadge: {
        backgroundColor: '#13294B', paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 6, overflow: 'hidden', color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 1
    },
    section: {
        backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#D4D0C8',
        padding: 20, marginBottom: 20,
        shadowColor: '#13294B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2
    },
    sectionTitle: { fontSize: 12, fontWeight: '800', color: '#A0A0A0', marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1.2 }, 
    row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 5 },
    iconContainer: {
        width: 40, height: 40, borderRadius: 8, backgroundColor: '#F0F4F8',
        justifyContent: 'center', alignItems: 'center', marginEnd: 15, marginTop: 2,
        borderWidth: 1, borderColor: '#EAE6DF'
    },
    rowLeft: { flex: 1, justifyContent: 'center', paddingTop: 2 },
    rowLabel: { fontSize: 12, color: '#888888', fontWeight: '700', marginBottom: 6 }, 
    rowValue: { fontSize: 15, color: '#13294B', fontWeight: '700' }, 
    input: {
        backgroundColor: '#F9F6F0', borderRadius: 8, borderWidth: 1, borderColor: '#D4D0C8',
        paddingHorizontal: 15, paddingVertical: 10, fontSize: 15, color: '#13294B', fontWeight: '500'
    },
    editIconBtn: {
        padding: 8, backgroundColor: '#FFF3E8', borderRadius: 8, marginTop: 4,
        borderWidth: 1, borderColor: 'rgba(232, 117, 26, 0.1)'
    },
    editActions: { flexDirection: 'row', gap: 8, marginTop: 23, paddingStart: 10 },
    saveButton: {
        backgroundColor: '#E8751A', width: 40, height: 40, borderRadius: 8,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#E8751A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3
    },
    cancelButton: {
        backgroundColor: '#F5F5F5', width: 40, height: 40, borderRadius: 8,
        justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#D4D0C8'
    },
    divider: { height: 1, backgroundColor: '#EAE6DF', marginVertical: 15, marginStart: 55 },
    logoutButton: {
        flexDirection: 'row', backgroundColor: '#FFEBEE', padding: 14,
        borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 10,
        borderWidth: 1, borderColor: 'rgba(211, 47, 47, 0.2)'
    },
    logoutButtonText: { color: '#D32F2F', fontSize: 15, fontWeight: '800' },
    deleteAccountButton: {
        flexDirection: 'row', padding: 14, borderRadius: 10, alignItems: 'center', 
        justifyContent: 'center', marginTop: 10, 
        backgroundColor: '#424242' // 👈 This makes it a solid dark grey
    },
    deleteAccountText: { 
        color: '#FFFFFF', // 👈 This makes the text white
        fontSize: 15, 
        fontWeight: '700' 
    },
    avatarWrapper: { position: 'relative', marginBottom: 12 },
avatarImage: { width: 90, height: 90, borderRadius: 45, resizeMode: 'cover' },
avatarCameraIcon: {
    position: 'absolute', bottom: 0, end: 0,
    backgroundColor: '#E8751A', borderRadius: 12,
    width: 24, height: 24, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#F9F6F0',
},
});