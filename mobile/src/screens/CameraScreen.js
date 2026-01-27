import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import api from '../config/api';
import { useAuth } from '../context/AuthContext';

export default function CameraScreen({ route, navigation }) {
  const { challenge } = route.params;
  const [hasPermission, setHasPermission] = useState(null);
  const [type, setType] = useState(Camera.Constants.Type.front);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef(null);
  const { user, updateUser } = useAuth();

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    try {
      if (challenge.type === 'video') {
        if (!recording) {
          setRecording(true);
          const video = await cameraRef.current.recordAsync({
            maxDuration: challenge.duration_seconds || 30,
            quality: Camera.Constants.VideoQuality['720p'],
          });
          setRecording(false);
          await uploadMedia(video.uri, 'video');
        } else {
          cameraRef.current.stopRecording();
          setRecording(false);
        }
      } else if (challenge.type === 'photo') {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });
        await uploadMedia(photo.uri, 'photo');
      }
    } catch (error) {
      console.error('Ошибка съемки:', error);
      Alert.alert('Ошибка', 'Не удалось сделать снимок/видео');
      setRecording(false);
    }
  };

  const handlePickFromLibrary = async () => {
    try {
      let result;
      if (challenge.type === 'video') {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: true,
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        await uploadMedia(result.assets[0].uri, challenge.type);
      }
    } catch (error) {
      console.error('Ошибка выбора из библиотеки:', error);
      Alert.alert('Ошибка', 'Не удалось выбрать файл');
    }
  };

  const uploadMedia = async (uri, mediaType) => {
    setUploading(true);

    try {
      const formData = new FormData();
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `video/mp4`;

      formData.append(mediaType, {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        type,
        name: filename,
      });

      // Загружаем медиа
      const uploadResponse = await api.post(`/media/${mediaType}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const mediaUrl = uploadResponse.data.url;

      // Отправляем выполнение челленджа
      const completeResponse = await api.post(
        `/projects/${challenge.project_id}/complete`,
        {
          challengeId: challenge.id,
          mediaUrl,
          mediaType,
          durationSeconds: challenge.duration_seconds,
        }
      );

      // Обновляем данные пользователя
      if (completeResponse.data.reward) {
        updateUser({
          ...user,
          coins: user.coins + completeResponse.data.reward.coins,
          experience: completeResponse.data.reward.new_experience,
          level: completeResponse.data.reward.new_level,
        });
      }

      Alert.alert(
        'Успех!',
        `Миссия выполнена! +${completeResponse.data.reward?.experience || 0} опыта, +${completeResponse.data.reward?.coins || 0} монет`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      Alert.alert('Ошибка', error.response?.data?.error || 'Не удалось загрузить медиа');
    } finally {
      setUploading(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Нет доступа к камере</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={type}
        ratio="16:9"
      >
        <View style={styles.overlay}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={32} color="#ffffff" />
            </TouchableOpacity>

            <View style={styles.challengeInfo}>
              <Text style={styles.challengeTitle}>{challenge.title}</Text>
              {challenge.duration_seconds && (
                <Text style={styles.durationText}>
                  {challenge.duration_seconds} сек
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.flipButton}
              onPress={() =>
                setType(
                  type === Camera.Constants.Type.back
                    ? Camera.Constants.Type.front
                    : Camera.Constants.Type.back
                )
              }
            >
              <Ionicons name="camera-reverse" size={28} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.libraryButton}
              onPress={handlePickFromLibrary}
            >
              <Ionicons name="images-outline" size={28} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.captureButton,
                recording && styles.captureButtonRecording,
              ]}
              onPress={handleCapture}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="large" color="#ffffff" />
              ) : recording ? (
                <View style={styles.recordingIndicator} />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </TouchableOpacity>

            <View style={styles.placeholder} />
          </View>
        </View>
      </Camera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeInfo: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  challengeTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  durationText: {
    color: '#ffffff',
    fontSize: 14,
    marginTop: 4,
    opacity: 0.8,
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 40,
  },
  libraryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#6366f1',
  },
  captureButtonRecording: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366f1',
  },
  recordingIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  placeholder: {
    width: 50,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
