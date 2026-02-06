import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface QueuedAction {
  id: string;
  type: 'create_task' | 'update_task' | 'voice_command' | 'add_customer';
  payload: any;
  createdAt: string;
  retryCount: number;
}

const QUEUE_KEY = '@voxi_offline_queue';

async function processQueuedAction(action: QueuedAction): Promise<void> {
  // Bu fonksiyon action-engine'e bağlanacak
  // Şimdilik placeholder
  console.log('Processing queued action:', action);
  // TODO: Import ve çağır: executeActions([action])
}

export const OfflineQueue = {
  // Kuyruğa ekle
  async add(action: Omit<QueuedAction, 'id' | 'createdAt' | 'retryCount'>) {
    const queue = await this.getAll();
    const newAction: QueuedAction = {
      ...action,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    queue.push(newAction);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return newAction;
  },

  // Tüm kuyruğu al
  async getAll(): Promise<QueuedAction[]> {
    const data = await AsyncStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  },

  // İşlemi kaldır
  async remove(id: string) {
    const queue = await this.getAll();
    const filtered = queue.filter(q => q.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  },

  // Senkronize et
  async sync() {
    const isConnected = (await NetInfo.fetch()).isConnected;
    if (!isConnected) return { synced: 0, failed: 0 };

    const queue = await this.getAll();
    let synced = 0;
    let failed = 0;

    for (const action of queue) {
      try {
        await processQueuedAction(action);
        await this.remove(action.id);
        synced++;
      } catch (err) {
        failed++;
        // Retry count artır
        action.retryCount++;
        if (action.retryCount >= 3) {
          await this.remove(action.id); // 3 denemede başarısız, sil
        }
      }
    }

    return { synced, failed };
  }
};

// Background sync listener
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    OfflineQueue.sync();
  }
});
