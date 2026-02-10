import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { speakText } from '../../utils/audio';
import { startRecording, stopRecording, transcribeAudio } from '../../utils/recording';
import { processCommand } from '../../lib/ai';
import { useAuth } from '../../contexts/AuthContext';
import * as Haptics from 'expo-haptics';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: 'urgent' | 'normal' | 'low';
  assigned_to: string;
  created_at: string;
  updated_at: string;
  workspace_id: string;
  profiles?: {
    full_name: string;
  };
}

export default function HomeScreen() {
  const { session, profile } = useAuth();
  const workspaceId = session?.user?.user_metadata?.active_workspace_id;
  const userName = profile?.full_name?.split(' ')[0] || 'Kullanıcı';

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [statusText, setStatusText] = useState('');
  const recordingRef = useRef<any>(null);

  // Recent tasks & created task
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [createdTask, setCreatedTask] = useState<Task | null>(null);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return `Günaydın ${userName}`;
    if (hour < 18) return `İyi günler ${userName}`;
    return `İyi akşamlar ${userName}`;
  };

  // Fetch recent tasks
  const fetchRecentTasks = async () => {
    if (!workspaceId) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, profiles:assigned_to(full_name)')
        .eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setRecentTasks(data || []);
    } catch (error) {
      console.error('❌ Son görevler fetch hatası:', error);
    }
  };

  // Load recent tasks
  useEffect(() => {
    fetchRecentTasks();
  }, [workspaceId]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      fetchRecentTasks();
    }, [workspaceId])
  );


  // Pulse animation for halo
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  // Wave animation for speaking
  useEffect(() => {
    if (isSpeaking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      waveAnim.setValue(0);
    }
  }, [isSpeaking]);

  // Start recording
  const handlePressIn = async () => {
    try {
      console.log('🎤 Kayıt başlıyor');
      setIsRecording(true);
      setStatusText('Dinliyorum...');
      setCreatedTask(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const recording = await startRecording();
      recordingRef.current = recording;
      console.log('🎤 Kayıt başladı');
    } catch (error) {
      console.error('❌ Kayıt başlatma hatası:', error);
      setIsRecording(false);
      setStatusText('');
      Alert.alert('Hata', 'Ses kaydı başlatılamadı');
    }
  };

  // Stop recording and process
  const handlePressOut = async () => {
    try {
      if (!recordingRef.current) {
        setIsRecording(false);
        setStatusText('');
        return;
      }

      console.log('🎤 Kayıt durduruluyor');
      setIsRecording(false);
      setIsProcessing(true);
      setStatusText('Düşünüyorum...');

      const result = await stopRecording(recordingRef.current);
      recordingRef.current = null;

      if (!result?.uri) {
        setStatusText('');
        setIsProcessing(false);
        return;
      }

      // Transcribe audio
      const transcript = await transcribeAudio(result.uri);
      
      if (!transcript) {
        setStatusText('');
        setIsProcessing(false);
        return;
      }

      console.log('📝 Transcript:', transcript);

      // AI analysis via Edge Function
      const { data: functionData, error: functionError } = await supabase.functions.invoke('ai-voice', {
        body: { 
          transcript,
          workspace_id: workspaceId,
        }
      });

      if (functionError || !functionData) {
        console.error('❌ AI analiz hatası:', functionError);
        setStatusText('');
        setIsProcessing(false);
        Alert.alert('Hata', 'AI analizi başarısız');
        return;
      }

      const aiResult = functionData;
      console.log('🧠 AI sonuç:', JSON.stringify(aiResult));

      // Create task if action is create_task
      if (aiResult.action === 'create_task' && aiResult.data) {
        const taskData: any = {
          title: aiResult.data.title,
          workspace_id: workspaceId,
          created_by: session?.user?.id,
          status: 'open',
          priority: aiResult.data.priority || 'normal',
        };

        if (aiResult.data.assigned_to) {
          taskData.assigned_to = aiResult.data.assigned_to;
        }
        if (aiResult.data.due_date) {
          taskData.due_date = aiResult.data.due_date;
        }

        const { data: newTask, error } = await supabase
          .from('tasks')
          .insert(taskData)
          .select('*, profiles:assigned_to(full_name)')
          .single();

        if (error) {
          console.error('❌ Görev oluşturma hatası:', error);
          setStatusText('');
          setIsProcessing(false);
          Alert.alert('Hata', 'Görev oluşturulamadı');
          return;
        }

        console.log('✅ Görev oluşturuldu:', newTask);
        setCreatedTask(newTask);
        await fetchRecentTasks();
        
        // TTS response
        const response = aiResult.response || 'Tamam';
        console.log('🔊 TTS:', response);
        setStatusText('');
        setIsSpeaking(true);
        setIsProcessing(false);

        await speakText(response);

        setIsSpeaking(false);
        setStatusText('');
        
        // Show created task for 5 seconds then open detail
        setTimeout(() => {
          router.push(`/task/${newTask.id}`);
          setCreatedTask(null);
        }, 5000);
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        // No task created, just give response
        const response = aiResult.response || 'Tamam';
        console.log('🔊 TTS:', response);
        setStatusText('');
        setIsSpeaking(true);
        setIsProcessing(false);

        await speakText(response);

        setIsSpeaking(false);
        setStatusText('');
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('❌ İşleme hatası:', error);
      setIsRecording(false);
      setIsProcessing(false);
      setIsSpeaking(false);
      setStatusText('');
      setCreatedTask(null);
      Alert.alert('Hata', 'Bir sorun oluştu');
    }
  };

  // Cancel TTS
  const handleCancelTTS = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      setIsSpeaking(false);
      setStatusText('');
      
      // Open task if exists
      if (createdTask) {
        router.push(`/task/${createdTask.id}`);
      }
    } catch (error) {
      console.error('❌ TTS iptal hatası:', error);
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins} dk önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };


  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F3EF" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>VOXI</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/settings')}>
          <Ionicons name="settings-outline" size={24} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Greeting Message */}
        {!statusText && !createdTask && (
          <Text style={styles.greeting}>{getGreeting()}</Text>
        )}

        {/* Status Text (during recording/processing) */}
        {statusText && (
          <Text style={styles.statusText}>{statusText}</Text>
        )}

        {/* Microphone Section */}
        <View style={styles.micContainer}>
          {/* Giant Halos (cover entire screen) */}
          <Animated.View
            style={[
              styles.halo,
              styles.halo1,
              {
                transform: [{ scale: isRecording ? pulseAnim : 1 }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.halo,
              styles.halo2,
              {
                transform: [{ scale: isRecording ? pulseAnim : 1 }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.halo,
              styles.halo3,
              {
                transform: [{ scale: isRecording ? pulseAnim : 1 }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.halo,
              styles.halo4,
              {
                transform: [{ scale: isRecording ? pulseAnim : 1 }],
              },
            ]}
          />

          {/* Giant Microphone Button */}
          <TouchableOpacity
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isProcessing || isSpeaking}
            style={[styles.micButton, (isProcessing || isSpeaking) && styles.micButtonDisabled]}
            activeOpacity={0.8}
          >
            {isProcessing ? (
              <ActivityIndicator size="large" color="#FFFFFF" />
            ) : (
              <Ionicons name="mic" size={80} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Created Task Summary */}
        {createdTask && !statusText && (
          <TouchableOpacity
            onPress={() => router.push(`/task/${createdTask.id}`)}
            style={styles.taskSummary}
          >
            <Text style={styles.taskSummaryTitle} numberOfLines={2}>
              {createdTask.title}
            </Text>
            <Text style={styles.taskSummaryMeta}>
              {createdTask.priority === 'urgent' ? '🔴 Acil' : ''}
              {createdTask.profiles?.full_name && ` · ${createdTask.profiles.full_name}`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Recent Updates - Bottom Strip */}
      {recentTasks.length > 0 && !isSpeaking && (
        <View style={styles.recentStrip}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentList}
          >
            {recentTasks.map((task, idx) => (
              <TouchableOpacity
                key={task.id}
                onPress={() => router.push(`/task/${task.id}`)}
                style={styles.recentItem}
              >
                <Text style={styles.recentText} numberOfLines={1}>
                  {task.title}
                </Text>
                <Text style={styles.recentTime}>
                  {formatRelativeTime(task.updated_at)}
                </Text>
                {idx < recentTasks.length - 1 && <View style={styles.recentDivider} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* TTS Speaking Banner */}
      {isSpeaking && (
        <View style={styles.speakingBanner}>
          <View style={styles.speakingContent}>
            <Text style={styles.speakingText}>Cevaplıyorum...</Text>
            <View style={styles.waveContainer}>
              {[0, 1, 2].map((i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.wave,
                    {
                      opacity: waveAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: i === 0 ? [0.3, 1] : i === 1 ? [0.5, 0.7] : [0.7, 0.4],
                      }),
                    },
                  ]}
                />
              ))}
            </View>
          </View>
          <TouchableOpacity onPress={handleCancelTTS} style={styles.cancelButton}>
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EF',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#F5F3EF',
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 1,
  },
  
  // Main Content Area
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Greeting
  greeting: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 60,
    position: 'absolute',
    top: 60,
  },
  
  // Status Text
  statusText: {
    fontSize: 18,
    color: '#8E8E93',
    fontWeight: '500',
    position: 'absolute',
    top: 60,
  },
  
  // Microphone Container
  micContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  
  // Giant Halos - Cover Entire Screen
  halo: {
    position: 'absolute',
    borderRadius: 9999,
  },
  halo1: {
    width: 300,
    height: 300,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  halo2: {
    width: 450,
    height: 450,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  halo3: {
    width: 650,
    height: 650,
    backgroundColor: 'rgba(0, 0, 0, 0.025)',
  },
  halo4: {
    width: 900,
    height: 900,
    backgroundColor: 'rgba(0, 0, 0, 0.015)',
  },
  
  // Giant Microphone Button
  micButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  micButtonDisabled: {
    opacity: 0.6,
  },
  
  // Task Summary (below mic)
  taskSummary: {
    position: 'absolute',
    bottom: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 40,
    maxWidth: '80%',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  taskSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
    textAlign: 'center',
  },
  taskSummaryMeta: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
  },
  
  // Recent Updates Strip (above tab bar)
  recentStrip: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingVertical: 12,
    paddingBottom: 8,
  },
  recentList: {
    paddingHorizontal: 16,
    gap: 16,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 16,
  },
  recentText: {
    fontSize: 13,
    color: '#1A1A1A',
    maxWidth: 150,
  },
  recentTime: {
    fontSize: 11,
    color: '#8E8E93',
  },
  recentDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#E5E5EA',
    marginLeft: 8,
  },
  
  // Speaking Banner
  speakingBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1A1A1A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  speakingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  speakingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wave: {
    width: 3,
    height: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  cancelButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
