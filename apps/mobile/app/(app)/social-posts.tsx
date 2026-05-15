import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, FlatList, RefreshControl, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { getSocialPosts, createSocialPost, generatePost, deletePost, SocialPost, Platform as SocialPlatform } from '../../src/api/social-posts';
import { TabBar } from '../../src/components/TabBar';
import { FilterChips } from '../../src/components/FilterChips';
import { KPIPill } from '../../src/components/KPIPill';
import { SectionCard } from '../../src/components/SectionCard';

const TABS = ['Queue', 'Published', 'Drafts', 'Create'];
const PLATFORMS: SocialPlatform[] = ['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK'];

function PostCard({ post, onDelete }: { post: SocialPost; onDelete: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;

  const platformColors: Record<string, string> = {
    TWITTER: '#1DA1F2', LINKEDIN: '#0A66C2', FACEBOOK: '#1877F2', INSTAGRAM: '#E4405F', TIKTOK: '#000000',
  };

  return (
    <View style={[styles.postCard, { backgroundColor: c.surface, borderColor: c.border, borderRadius: theme.radius }]}>
      <View style={styles.postHeader}>
        <View style={[styles.platformBadge, { backgroundColor: platformColors[post.platform] || c.accent }]}>
          <Text style={styles.platformText}>{post.platform}</Text>
        </View>
        <Text style={[styles.postDate, { color: c.text3 }]}>
          {new Date(post.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Text style={[styles.postContent, { color: c.text1 }]} numberOfLines={3}>{post.content}</Text>
      {post.hashtags && post.hashtags.length > 0 && (
        <Text style={[styles.hashtags, { color: c.accent }]}>
          {post.hashtags.map((h) => `#${h}`).join(' ')}
        </Text>
      )}
      <View style={styles.postFooter}>
        <View style={[styles.statusBadge, {
          backgroundColor: post.status === 'PUBLISHED' ? 'rgba(74,222,128,0.15)' :
            post.status === 'SCHEDULED' ? 'rgba(192,132,252,0.15)' : 'rgba(255,255,255,0.08)',
        }]}>
          <Text style={[styles.statusText, {
            color: post.status === 'PUBLISHED' ? c.positive :
              post.status === 'SCHEDULED' ? c.accent : c.text2,
          }]}>{post.status}</Text>
        </View>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ color: c.negative, fontSize: 12, fontWeight: '600' }}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SocialPostsScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const [activeTab, setActiveTab] = useState(0);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create tab state
  const [platform, setPlatform] = useState<SocialPlatform>('TWITTER');
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const statusForTab = activeTab === 0 ? 'SCHEDULED' : activeTab === 1 ? 'PUBLISHED' : activeTab === 2 ? 'DRAFT' : undefined;

  const fetchPosts = useCallback(async () => {
    if (activeTab === 3) { setLoading(false); return; }
    try {
      const result = await getSocialPosts(statusForTab);
      setPosts(result.posts || []);
    } catch (e) {
      setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, statusForTab]);

  useEffect(() => { setLoading(true); fetchPosts(); }, [fetchPosts]);

  const onRefresh = () => { setRefreshing(true); fetchPosts(); };

  const handleDelete = (post: SocialPost) => {
    Alert.alert('Delete Post', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deletePost(post.id); setPosts((p) => p.filter((x) => x.id !== post.id)); } catch (e) {}
      }},
    ]);
  };

  const handleGenerate = async () => {
    if (!topic.trim()) { Alert.alert('Error', 'Enter a topic first.'); return; }
    setGenerating(true);
    try {
      const result = await generatePost(topic, platform);
      setContent(result.content);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to generate content.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async (status: 'DRAFT' | 'SCHEDULED') => {
    if (!content.trim()) { Alert.alert('Error', 'Enter content first.'); return; }
    setSaving(true);
    try {
      await createSocialPost({ platform, content, status });
      setContent('');
      setTopic('');
      Alert.alert('Saved', `Post saved as ${status.toLowerCase()}.`);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to save post.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && activeTab !== 3) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <TabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab < 3 && (
        <FlatList
          data={posts}
          keyExtractor={(item: SocialPost) => item.id}
          renderItem={({ item }: { item: SocialPost }) => <PostCard post={item} onDelete={() => handleDelete(item)} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: c.text2 }]}>No posts found</Text>
            </View>
          }
        />
      )}

      {activeTab === 3 && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <SectionCard title="Create Post">
            <Text style={[styles.inputLabel, { color: c.text2 }]}>Platform</Text>
            <FilterChips
              options={PLATFORMS}
              selected={platform}
              onSelect={(p) => setPlatform(p as SocialPlatform)}
            />

            <Text style={[styles.inputLabel, { color: c.text2, marginTop: 12 }]}>Topic (for AI generation)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text1, borderRadius: theme.radius * 0.6 }]}
              value={topic}
              onChangeText={setTopic}
              placeholder="e.g. New feature launch"
              placeholderTextColor={c.text3}
            />
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: c.accentSoft, borderRadius: theme.radius, marginTop: 8 }]}
              onPress={handleGenerate}
              disabled={generating}
            >
              <Text style={[styles.btnText, { color: c.accent }]}>{generating ? 'Generating...' : 'AI Generate'}</Text>
            </TouchableOpacity>

            <Text style={[styles.inputLabel, { color: c.text2, marginTop: 16 }]}>Content</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text1, borderRadius: theme.radius * 0.6 }]}
              value={content}
              onChangeText={setContent}
              placeholder="Write your post..."
              placeholderTextColor={c.text3}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.btn, { flex: 1, backgroundColor: c.surfaceAlt, borderRadius: theme.radius }]}
                onPress={() => handleSave('DRAFT')}
                disabled={saving}
              >
                <Text style={[styles.btnText, { color: c.text1 }]}>Save Draft</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { flex: 1, backgroundColor: c.accent, borderRadius: theme.radius }]}
                onPress={() => handleSave('SCHEDULED')}
                disabled={saving}
              >
                <Text style={[styles.btnText, { color: '#ffffff' }]}>Schedule</Text>
              </TouchableOpacity>
            </View>
          </SectionCard>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { paddingTop: 60, alignItems: 'center' },
  emptyText: { fontSize: 14 },
  postCard: { padding: 16, borderWidth: 1, marginBottom: 12 },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  platformBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  platformText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  postDate: { fontSize: 11 },
  postContent: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  hashtags: { fontSize: 12, marginBottom: 10 },
  postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '600' },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { height: 44, paddingHorizontal: 14, borderWidth: 1, fontSize: 14 },
  textArea: { minHeight: 120, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, fontSize: 14 },
  btn: { paddingVertical: 12, alignItems: 'center' },
  btnText: { fontSize: 14, fontWeight: '700' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
});
