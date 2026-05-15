import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface TransactionItemProps {
  name: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
}

export function TransactionItem({ name, date, amount, type }: TransactionItemProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const amountColor = type === 'income' ? c.positive : c.negative;
  const prefix = type === 'income' ? '+' : '-';
  const formatted = `${prefix}$${Math.abs(amount).toLocaleString()}`;

  return (
    <View style={[styles.row, { borderBottomColor: c.border }]}>
      <View style={[styles.indicator, { backgroundColor: amountColor + '20', borderRadius: theme.radius * 0.7 }]}>
        <View style={[styles.indicatorDot, { backgroundColor: amountColor }]} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: c.text1 }]}>{name}</Text>
        <Text style={[styles.date, { color: c.text2 }]}>{date}</Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>{formatted}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  indicator: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  indicatorDot: { width: 10, height: 10, borderRadius: 5 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600' },
  date: { fontSize: 11, marginTop: 1 },
  amount: { fontSize: 14, fontWeight: '700' },
});
