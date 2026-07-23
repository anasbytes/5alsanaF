import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function StarRating({ rating, count, size = 12 }) {
    const avg = parseFloat(rating) || 0;
    const total = parseInt(count) || 0;

    if (total === 0) return null;

    return (
        <View style={styles.container}>
            <Ionicons name="star" size={size} color="#F5A623" />
            <Text style={[styles.rating, { fontSize: size }]}>{avg.toFixed(1)}</Text>
            <Text style={[styles.count, { fontSize: size }]}>({total})</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    rating: { fontWeight: '700', color: '#1A1A1A' },
    count: { color: '#888' },
});