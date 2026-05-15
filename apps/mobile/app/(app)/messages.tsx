import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, RefreshControl, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { getMessages, markMessageRead, deleteMessage, Message, MessagesResponse } from '../../src/api/messages';
import { MessageCard } from '../../src/components/MessageCard';
import { FilterChips } from '../../src/components/FilterChips';
import { KPIPill } from '../../src/components/KPIPill';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString();
}

export default function MessagesScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchData = useCallback(async (p = 1, append = false) => {
    try {
      const result: MessagesResponse = await getMessages(filter, p);
      if (append) {
        setMessages((prev) => [...prev, ...result.messages]);
      } else {
        setMessages(result.messages);
      }
      setUnreadCount(result.unreadCount);
      setHasMore(p < result.pagination.totalPages);
    } catch (e) {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { setPage(1); setLoading(true); fetchData(1); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); setPage(1); fetchData(1); };

  const onEndReached = () => {
    if (!hasMore || loading) return;
    const next = page + 1;
    setPage(next);
    fetchData(next, true);
  };

  const handleToggleRead = async (msg: Message) => {
    try {
      await markMessageRead(msg.id, !msg.read);
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, read: !m.read } : m));
      setUnreadCount((prev) => msg.read ? prev + 1 : prev - 1);
    } catch (e) {
      // silently fail
    }
  };

  const handleDelete = (msg: Message) => {
    Alert.alert('Delete Message', `Delete message from ${msg.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteMessage(msg.id);
            setMessages((prev) => prev.filter((m) => m.id !== msg.id));
          } catch (e) { /* silently fail */ }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={styles.header}>
        <FilterChips options={['all', 'unread', 'read']} selected={filter} onSelect={setFilter} />
        <View style={styles.pillRow}>
          <KPIPill label="Total" value={String(messages.length)} />
          <KPIPill label="Unread" value={String(unreadCount)} />
        </View>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item: Message) => item.id}
        renderItem={({ item }: { item: Message }) => (
          <MessageCard
            name={item.name}
            email={item.email}
            message={item.message}
            date={formatDate(item.createdAt)}
            read={item.read}
            onPress={() => handleToggleRead(item)}
            onToggleRead={() => handleToggleRead(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: c.text2 }]}>No messages</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 12 },
  pillRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14 },
});
