import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../config/api';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;

export default function SwipeScreen({ navigation }) {
  const [challenges, setChallenges] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const position = useRef(new Animated.ValueXY()).current;
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      const response = await api.get('/challenges/swipe', {
        params: { limit: 20 },
      });
      setChallenges(response.data.challenges);
    } catch (error) {
      console.error('Ошибка загрузки челленджей:', error);
    } finally {
      setLoading(false);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        position.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          // Свайп вправо - принять
          handleAccept();
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Свайп влево - пропустить
          handleSkip();
        } else {
          // Вернуть на место
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const handleAccept = () => {
    if (currentIndex >= challenges.length) return;
    
    const challenge = challenges[currentIndex];
    Animated.timing(position, {
      toValue: { x: SCREEN_WIDTH, y: 0 },
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      navigation.navigate('Camera', { challenge });
      position.setValue({ x: 0, y: 0 });
      setCurrentIndex((prev) => prev + 1);
    });
  };

  const handleSkip = () => {
    if (currentIndex >= challenges.length) return;

    Animated.timing(position, {
      toValue: { x: -SCREEN_WIDTH, y: 0 },
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      setCurrentIndex((prev) => prev + 1);
      
      // Загружаем больше челленджей если нужно
      if (currentIndex >= challenges.length - 3) {
        loadChallenges();
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (currentIndex >= challenges.length) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="flame-outline" size={64} color="#9ca3af" />
        <Text style={styles.emptyText}>Новых челленджей пока нет</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => {
            setCurrentIndex(0);
            loadChallenges();
          }}
        >
          <Text style={styles.refreshButtonText}>Обновить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const challenge = challenges[currentIndex];
  const cardStyle = {
    transform: [
      { translateX: position.x },
      { translateY: position.y },
      { rotate },
    ],
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#f3f4f6', '#e5e7eb']}
        style={styles.background}
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>ForAll</Text>
        <View style={styles.userInfo}>
          <Text style={styles.levelText}>Уровень {user?.level || 1}</Text>
          <View style={styles.coinsContainer}>
            <Ionicons name="logo-bitcoin" size={16} color="#f59e0b" />
            <Text style={styles.coinsText}>{user?.coins || 0}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardContainer}>
        <Animated.View
          style={[styles.card, cardStyle]}
          {...panResponder.panHandlers}
        >
          <LinearGradient
            colors={['#6366f1', '#8b5cf6', '#ec4899']}
            style={styles.cardGradient}
          >
            <View style={styles.cardContent}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>
                  {challenge.type === 'video' ? '🎥 Видео' :
                   challenge.type === 'photo' ? '📸 Фото' :
                   challenge.type === 'audio' ? '🎵 Аудио' : '📝 Текст'}
                </Text>
              </View>

              <Text style={styles.challengeTitle}>{challenge.title}</Text>
              
              {challenge.description && (
                <Text style={styles.challengeDescription}>
                  {challenge.description}
                </Text>
              )}

              {challenge.duration_seconds && (
                <View style={styles.durationBadge}>
                  <Ionicons name="time-outline" size={16} color="#ffffff" />
                  <Text style={styles.durationText}>
                    {challenge.duration_seconds} сек
                  </Text>
                </View>
              )}

              {challenge.project_title && (
                <View style={styles.projectInfo}>
                  <Ionicons name="people-outline" size={20} color="#ffffff" />
                  <Text style={styles.projectText}>
                    Проект: {challenge.project_title}
                  </Text>
                </View>
              )}

              {challenge.is_completed && (
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                  <Text style={styles.completedText}>Выполнено</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Кнопки действий */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.skipButton]}
            onPress={handleSkip}
          >
            <Ionicons name="close" size={32} color="#ef4444" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={handleAccept}
          >
            <Ionicons name="checkmark" size={32} color="#10b981" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  coinsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  coinsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_HEIGHT * 0.7,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardGradient: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  cardContent: {
    flex: 1,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  typeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  challengeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  challengeDescription: {
    fontSize: 18,
    color: '#ffffff',
    opacity: 0.9,
    lineHeight: 24,
    marginBottom: 20,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginBottom: 16,
  },
  durationText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  projectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
    marginTop: 'auto',
  },
  projectText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginTop: 16,
  },
  completedText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginTop: 30,
    marginBottom: 40,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
