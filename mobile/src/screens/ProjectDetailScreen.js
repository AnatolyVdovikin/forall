import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../config/api';
import { useAuth } from '../context/AuthContext';

export default function ProjectDetailScreen({ route, navigation }) {
  const { projectId } = route.params;
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liking, setLiking] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      const response = await api.get(`/projects/${projectId}`);
      setProject(response.data);
    } catch (error) {
      console.error('Ошибка загрузки проекта:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить проект');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (liking) return;

    setLiking(true);
    try {
      const response = await api.post(`/projects/${projectId}/like`);
      setProject((prev) => ({
        ...prev,
        is_liked: response.data.liked,
        likes_count: response.data.liked
          ? prev.likes_count + 1
          : prev.likes_count - 1,
      }));
    } catch (error) {
      console.error('Ошибка лайка:', error);
    } finally {
      setLiking(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!project) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Проект не найден</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#6366f1', '#8b5cf6', '#ec4899']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>

        {project.thumbnail_url && (
          <Image
            source={{ uri: project.thumbnail_url }}
            style={styles.headerImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.headerContent}>
          <Text style={styles.title}>{project.title}</Text>
          {project.description && (
            <Text style={styles.description}>{project.description}</Text>
          )}

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Ionicons name="people" size={20} color="#ffffff" />
              <Text style={styles.statText}>
                {project.participants_count || 0} участников
              </Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="eye" size={20} color="#ffffff" />
              <Text style={styles.statText}>
                {project.views_count || 0} просмотров
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.likeButton,
              project.is_liked && styles.likeButtonActive,
            ]}
            onPress={handleLike}
            disabled={liking}
          >
            <Ionicons
              name={project.is_liked ? 'heart' : 'heart-outline'}
              size={24}
              color={project.is_liked ? '#ef4444' : '#6b7280'}
            />
            <Text
              style={[
                styles.likeButtonText,
                project.is_liked && styles.likeButtonTextActive,
              ]}
            >
              {project.likes_count || 0}
            </Text>
          </TouchableOpacity>
        </View>

        {project.participants && project.participants.length > 0 && (
          <View style={styles.participantsSection}>
            <Text style={styles.sectionTitle}>Участники</Text>
            <View style={styles.participantsGrid}>
              {project.participants.map((participant) => (
                <View key={participant.id} style={styles.participantCard}>
                  {participant.media_type === 'video' ? (
                    <View style={styles.mediaPlaceholder}>
                      <Ionicons name="videocam" size={24} color="#9ca3af" />
                    </View>
                  ) : (
                    <Image
                      source={{ uri: participant.media_url }}
                      style={styles.participantMedia}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.participantInfo}>
                    <Text style={styles.participantUsername} numberOfLines={1}>
                      {participant.username}
                    </Text>
                    {participant.is_featured && (
                      <View style={styles.featuredBadge}>
                        <Ionicons name="star" size={12} color="#f59e0b" />
                        <Text style={styles.featuredText}>Топ</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    minHeight: 300,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 20,
  },
  headerContent: {
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 20,
    lineHeight: 22,
  },
  stats: {
    flexDirection: 'row',
    gap: 24,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  actions: {
    marginBottom: 30,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  likeButtonActive: {
    backgroundColor: '#fef2f2',
  },
  likeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  likeButtonTextActive: {
    color: '#ef4444',
  },
  participantsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  participantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  participantCard: {
    width: '48%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f9fafb',
  },
  participantMedia: {
    width: '100%',
    height: 120,
  },
  mediaPlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantInfo: {
    padding: 8,
  },
  participantUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  featuredText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400e',
  },
  errorText: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 40,
  },
});
