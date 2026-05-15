import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { getConsolidatedBoards, Board, Column, Card } from '../../src/api/projects';
import { KPIPill } from '../../src/components/KPIPill';
import { SectionCard } from '../../src/components/SectionCard';

function priorityColor(priority: string | undefined, colors: any): string {
  switch (priority?.toLowerCase()) {
    case 'high': case 'urgent': return colors.negative;
    case 'medium': return colors.warning;
    case 'low': return colors.positive;
    default: return colors.text2;
  }
}

function TaskCard({ card }: { card: Card }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const pColor = priorityColor(card.priority, c);

  return (
    <View style={[styles.taskCard, { backgroundColor: c.surface, borderColor: c.border, borderRadius: theme.radius }]}>
      <Text style={[styles.taskTitle, { color: c.text1 }]} numberOfLines={2}>{card.title}</Text>
      {card.description && (
        <Text style={[styles.taskDesc, { color: c.text2 }]} numberOfLines={2}>{card.description}</Text>
      )}
      <View style={styles.taskMeta}>
        {card.priority && (
          <View style={[styles.priorityBadge, { backgroundColor: pColor + '18', borderRadius: theme.radius * 0.5 }]}>
            <Text style={[styles.priorityText, { color: pColor }]}>{card.priority}</Text>
          </View>
        )}
        <Text style={[styles.taskDate, { color: c.text2 }]}>
          {new Date(card.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
        </Text>
      </View>
    </View>
  );
}

function KanbanColumn({ column }: { column: Column }) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={[styles.kanbanCol, { borderRadius: theme.radius }]}>
      <View style={styles.colHeader}>
        <Text style={[styles.colTitle, { color: c.text1 }]}>{column.name}</Text>
        <View style={[styles.colCount, { backgroundColor: c.accentSoft, borderRadius: theme.radius * 0.5 }]}>
          <Text style={[styles.colCountText, { color: c.accent }]}>{column.cards.length}</Text>
        </View>
      </View>
      {column.cards.map((card) => (
        <TaskCard key={card.id} card={card} />
      ))}
      {column.cards.length === 0 && (
        <Text style={[styles.emptyCol, { color: c.text2 }]}>No tasks</Text>
      )}
    </View>
  );
}

export default function ProjectsScreen() {
  const { theme } = useTheme();
  const c = theme.colors;

  const [boards, setBoards] = useState<Board[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const boardList = await getConsolidatedBoards();
      setBoards(boardList);
      if (boardList.length > 0) {
        setColumns(boardList[0].columns || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const totalCards = columns.reduce((sum, col) => sum + col.cards.length, 0);
  const doneCol = columns.find((col) => col.name.toLowerCase().includes('done') || col.name.toLowerCase().includes('complete'));
  const completedCards = doneCol?.cards.length || 0;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
    >
      {/* Summary Stats */}
      <View style={styles.pillRow}>
        <KPIPill label="Boards" value={`${boards.length}`} />
        <KPIPill label="Tasks" value={`${totalCards}`} />
        <KPIPill label="Done" value={`${completedCards}`} />
      </View>

      {/* Board Name */}
      {boards.length > 0 && (
        <Text style={[styles.boardName, { color: c.text1 }]}>{boards[0].name}</Text>
      )}

      {/* Kanban Board (horizontal scroll) */}
      {columns.length > 0 && (
        <FlatList
          data={columns}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item: Column) => item.id}
          renderItem={({ item }: { item: Column }) => <KanbanColumn column={item} />}
          contentContainerStyle={styles.kanbanScroll}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* All Tasks List */}
      {columns.length > 0 && (
        <SectionCard title="All Tasks">
          {columns.flatMap((col) =>
            col.cards.map((card) => (
              <View key={card.id} style={[styles.taskListRow, { borderBottomColor: c.border }]}>
                <View style={[styles.statusDot, { backgroundColor: priorityColor(card.priority, c) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskListTitle, { color: c.text1 }]} numberOfLines={1}>{card.title}</Text>
                  <Text style={[styles.taskListCol, { color: c.text2 }]}>{col.name}</Text>
                </View>
                {card.priority && (
                  <Text style={[styles.taskListPriority, { color: priorityColor(card.priority, c) }]}>
                    {card.priority}
                  </Text>
                )}
              </View>
            ))
          ).slice(0, 15)}
        </SectionCard>
      )}

      {boards.length === 0 && !loading && (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: c.text1 }]}>No Projects</Text>
          <Text style={{ color: c.text2, fontSize: 13, textAlign: 'center' }}>
            No project boards found. Create one in the dashboard.
          </Text>
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pillRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  boardName: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  kanbanScroll: { paddingRight: 16 },
  kanbanCol: { width: 240, marginRight: 14, padding: 10, backgroundColor: 'rgba(128,128,128,0.05)' },
  colHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 4 },
  colTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  colCount: { paddingHorizontal: 8, paddingVertical: 2 },
  colCountText: { fontSize: 11, fontWeight: '700' },
  emptyCol: { fontSize: 12, textAlign: 'center', paddingVertical: 20 },
  taskCard: { padding: 12, borderWidth: 1, marginBottom: 8 },
  taskTitle: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  taskDesc: { fontSize: 12, lineHeight: 16, marginBottom: 6 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2 },
  priorityText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  taskDate: { fontSize: 10 },
  taskListRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  taskListTitle: { fontSize: 13, fontWeight: '600' },
  taskListCol: { fontSize: 11, marginTop: 1 },
  taskListPriority: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
});
