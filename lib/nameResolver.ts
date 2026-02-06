import { supabase } from './supabase';

export async function resolveNameToUserId(
  name: string, 
  workspaceId: string
): Promise<{ userId: string | null; confidence: 'exact' | 'fuzzy' | 'ambiguous' | 'not_found' }> {
  
  // 1. Tam eşleşme ara
  const { data: exactMatch } = await supabase
    .from('workspace_members')
    .select('user_id, profiles:user_id(full_name)')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .ilike('profiles.full_name', name);

  if (exactMatch?.length === 1) {
    return { userId: exactMatch[0].user_id, confidence: 'exact' };
  }

  // 2. Fuzzy arama (ilk isim veya kısmi eşleşme)
  const { data: fuzzyMatch } = await supabase
    .from('workspace_members')
    .select('user_id, profiles:user_id(full_name)')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .ilike('profiles.full_name', `%${name}%`);

  if (fuzzyMatch?.length === 1) {
    return { userId: fuzzyMatch[0].user_id, confidence: 'fuzzy' };
  }

  if (fuzzyMatch && fuzzyMatch.length > 1) {
    // Birden fazla "Ahmet" var - kullanıcıya sor
    return { userId: null, confidence: 'ambiguous' };
  }

  return { userId: null, confidence: 'not_found' };
}
