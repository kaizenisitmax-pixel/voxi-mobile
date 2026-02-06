import { supabase } from './supabase';
import { getWorkspaceInfo } from './workspace';

export interface ActionResult {
  action: string;
  success: boolean;
  message: string;
  data?: any;
}

export async function executeActions(
  actions: any[]
): Promise<ActionResult[]> {
  const results: ActionResult[] = [];
  const wsInfo = await getWorkspaceInfo();
  if (!wsInfo) {
    return [{ action: 'error', success: false, message: 'Workspace bilgisi alınamadı' }];
  }

  for (const action of actions) {
    try {
      let result: ActionResult;

      switch (action.action) {
        case 'create_task':
          result = await createTask(action, wsInfo);
          break;
        case 'update_task':
          result = await updateTask(action, wsInfo);
          break;
        case 'create_customer':
          result = await createCustomer(action, wsInfo);
          break;
        case 'create_reminder':
          result = await createReminder(action, wsInfo);
          break;
        case 'link_task_customer':
          result = await linkTaskCustomer(action);
          break;
        case 'send_notification':
          result = await sendNotification(action, wsInfo);
          break;
        default:
          result = { action: action.action, success: false, message: `Bilinmeyen aksiyon: ${action.action}` };
      }

      results.push(result);
    } catch (err) {
      console.error(`Action error (${action.action}):`, err);
      results.push({ action: action.action, success: false, message: 'Beklenmeyen hata' });
    }
  }

  return results;
}

// --- Aksiyon fonksiyonları ---

async function createTask(action: any, wsInfo: any): Promise<ActionResult> {
  const members = Array.isArray(action.assigned_to) 
    ? action.assigned_to 
    : action.assigned_to ? [action.assigned_to] : [];
  const isGroup = members.length > 1;

  const { data, error } = await supabase.from('tasks').insert({
    title: action.title,
    status: 'open',
    priority: action.priority || 'normal',
    assigned_to: members.join(', ') || null,
    is_group: isGroup,
    group_members: members,
    created_by: wsInfo.fullName,
    created_by_user: wsInfo.userId,
    workspace_id: wsInfo.workspaceId,
    team_id: wsInfo.teamId,
    due_date: action.due_date || null,
    what_description: action.what_description || null,
    where_location: action.where_location || null,
    how_expectations: action.how_expectations || null,
    why_purpose: action.why_purpose || null,
    customer_id: action.customer_id || null,
    created_at: new Date().toISOString(),
  }).select().single();

  if (error) return { action: 'create_task', success: false, message: `Görev oluşturulamadı: ${error.message}` };

  // Atanan kişiye bildirim
  if (members.length > 0 && data) {
    await notifyAssignee(members, data, wsInfo);
  }

  return {
    action: 'create_task',
    success: true,
    message: `"${data.title}" görevi oluşturuldu${members.length > 0 ? ` → ${members.join(', ')}` : ''}`,
    data,
  };
}

async function updateTask(action: any, wsInfo: any): Promise<ActionResult> {
  if (!action.task_id) return { action: 'update_task', success: false, message: 'task_id gerekli' };

  const updateData: any = {};
  if (action.status) updateData.status = action.status;
  if (action.priority) updateData.priority = action.priority;
  if (action.assigned_to) updateData.assigned_to = action.assigned_to;
  if (action.due_date) updateData.due_date = action.due_date;
  if (action.title) updateData.title = action.title;

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', action.task_id)
    .select()
    .single();

  if (error) return { action: 'update_task', success: false, message: `Görev güncellenemedi: ${error.message}` };

  return { action: 'update_task', success: true, message: `"${data.title}" güncellendi`, data };
}

async function createCustomer(action: any, wsInfo: any): Promise<ActionResult> {
  const { data, error } = await supabase.from('customers').insert({
    workspace_id: wsInfo.workspaceId,
    company_name: action.company_name || action.name || action.company || null,
    contact_person: action.contact_person || action.name || null,
    email: action.email || null,
    phone: action.phone || null,
    address: action.address || null,
    tax_number: action.tax_number || null,
    sector: action.sector || null,
    notes: action.notes || null,
    status: ['active', 'inactive', 'lead', 'lost'].includes(action.status) ? action.status : 'lead',
    created_by: wsInfo.fullName,
    owner: wsInfo.fullName,
    created_at: new Date().toISOString(),
  }).select().single();

  if (error) return { action: 'create_customer', success: false, message: `Müşteri oluşturulamadı: ${error.message}` };

  return { action: 'create_customer', success: true, message: `"${data.company_name || data.contact_person}" müşteri kartı oluşturuldu`, data };
}

async function createReminder(action: any, wsInfo: any): Promise<ActionResult> {
  const { data, error } = await supabase.from('reminders').insert({
    task_id: action.task_id || null,
    user_id: wsInfo.userId,
    workspace_id: wsInfo.workspaceId,
    remind_at: action.remind_at,
    note: action.note || '',
    is_done: false,
    created_by: wsInfo.fullName,
    created_at: new Date().toISOString(),
  }).select().single();

  if (error) return { action: 'create_reminder', success: false, message: `Hatırlatıcı oluşturulamadı: ${error.message}` };

  return { action: 'create_reminder', success: true, message: `Hatırlatıcı ayarlandı: ${action.remind_at}`, data };
}

async function linkTaskCustomer(action: any): Promise<ActionResult> {
  if (!action.task_id || !action.customer_id) {
    return { action: 'link_task_customer', success: false, message: 'task_id ve customer_id gerekli' };
  }

  const { error } = await supabase
    .from('tasks')
    .update({ customer_id: action.customer_id })
    .eq('id', action.task_id);

  if (error) return { action: 'link_task_customer', success: false, message: `Bağlama hatası: ${error.message}` };

  return { action: 'link_task_customer', success: true, message: 'Görev müşteriye bağlandı' };
}

async function sendNotification(action: any, wsInfo: any): Promise<ActionResult> {
  let targetUserId = action.user_id;

  // Eğer user_id UUID formatında değilse, isimden bul
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (targetUserId && !uuidRegex.test(targetUserId)) {
    // İsimden user_id bul
    const { data: members } = await supabase
      .from('workspace_members')
      .select('user_id, profiles!inner(full_name)')
      .eq('workspace_id', wsInfo.workspaceId)
      .eq('is_active', true);

    const target = members?.find((m: any) =>
      m.profiles?.full_name?.toLowerCase().includes(targetUserId.toLowerCase())
    );

    if (target) {
      targetUserId = target.user_id;
    } else {
      return { action: 'send_notification', success: false, message: `"${action.user_id}" kullanıcısı bulunamadı` };
    }
  }

  const { error } = await supabase.from('notifications').insert({
    user_id: targetUserId,
    workspace_id: wsInfo.workspaceId,
    type: action.type || 'system',
    title: action.title,
    body: action.body,
    data: action.data || {},
    channel: 'push',
    is_read: false,
    sent_at: new Date().toISOString(),
  });

  if (error) return { action: 'send_notification', success: false, message: `Bildirim gönderilemedi: ${error.message}` };

  return { action: 'send_notification', success: true, message: 'Bildirim gönderildi' };
}

// Atanan kişiye push bildirim
async function notifyAssignee(members: string[], task: any, wsInfo: any) {
  try {
    // İsimden user_id bul (workspace_members + profiles join)
    for (const memberName of members) {
      const { data: wsMember } = await supabase
        .from('workspace_members')
        .select('user_id, profiles!inner(full_name)')
        .eq('workspace_id', wsInfo.workspaceId)
        .eq('is_active', true);

      const target = wsMember?.find((m: any) =>
        m.profiles?.full_name?.toLowerCase().includes(memberName.toLowerCase())
      );

      if (target && target.user_id !== wsInfo.userId) {
        // Bildirim tablosuna yaz
        await supabase.from('notifications').insert({
          user_id: target.user_id,
          workspace_id: wsInfo.workspaceId,
          type: 'task_assigned',
          title: 'Yeni görev atandı',
          body: `"${task.title}" görevi size atandı`,
          data: { taskId: task.id, taskTitle: task.title },
          channel: 'push',
          is_read: false,
          sent_at: new Date().toISOString(),
        });

        // Push bildirim gönder (push_tokens tablosu varsa)
        try {
          const { data: tokens } = await supabase
            .from('push_tokens')
            .select('token')
            .eq('user_id', target.user_id)
            .eq('is_active', true);

          if (tokens && tokens.length > 0) {
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(
                tokens.map(t => ({
                  to: t.token,
                  sound: 'default',
                  title: 'Yeni görev atandı',
                  body: `"${task.title}" görevi size atandı`,
                  data: { screen: 'task', taskId: task.id },
                }))
              ),
            });
          }
        } catch (pushErr) {
          console.error('Push gönderme hatası:', pushErr);
        }
      }
    }
  } catch (err) {
    console.error('Bildirim hatası:', err);
  }
}

// JSON parse helper — Claude response'undan action bloklarını çıkar
export function extractActions(text: string): any[] {
  const actions: any[] = [];
  // ```json ... ``` bloklarını bul
  const jsonBlockRegex = /```json\s*([\s\S]*?)```/g;
  let match;
  while ((match = jsonBlockRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (Array.isArray(parsed)) {
        actions.push(...parsed);
      } else {
        actions.push(parsed);
      }
    } catch (e) {
      console.error('JSON parse error:', e);
    }
  }
  return actions;
}

// Response'tan JSON bloklarını temizle (kullanıcıya gösterme)
export function cleanResponseText(text: string): string {
  return text.replace(/```json[\s\S]*?```/g, '').trim();
}
