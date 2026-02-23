import AsyncStorage from '@react-native-async-storage/async-storage';
import { getIndustry, Industry } from './industries';

const STORAGE_KEY = 'voxi_industry_id';

let cachedIndustryId: number | null = null;

export async function getSelectedIndustryId(): Promise<number | null> {
  if (cachedIndustryId !== null) return cachedIndustryId;
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY);
    cachedIndustryId = val ? parseInt(val, 10) : null;
    return cachedIndustryId;
  } catch {
    return null;
  }
}

export async function setSelectedIndustryId(id: number | null): Promise<void> {
  cachedIndustryId = id;
  try {
    if (id === null) {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, String(id));
    }
  } catch {}
}

export async function getSelectedIndustry(): Promise<Industry | null> {
  const id = await getSelectedIndustryId();
  return id ? getIndustry(id) || null : null;
}
