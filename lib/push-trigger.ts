import { supabase } from './supabase';

export async function triggerTaskAssignedPush(task: {
  id: string;
  title: string;
  assigned_to: string;
  priority: string;
  created_by: string;
}) {
  try {
    // Atanan kişinin user_id'sini bul (workspace_members'dan)
    const { data: member } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', '9bf0a8cd-c704-4800-991a-cecb2453b42d')
      .ilike('profiles.first_name', `%${task.assigned_to.split(' ')[0]}%`)
      .limit(1)
      .single();

    // Eğer kullanıcı bulunamazsa veya kendine atadıysa gönderme
    if (!member?.user_id) return;

    const isUrgent = task.priority === 'urgent';

    // send-push edge function'ı çağır
    const { error } = await supabase.functions.invoke('send-push', {
      body: {
        user_ids: [member.user_id],
        title: isUrgent ? '🔴 Acil Görev!' : 'Yeni Görev',
        body: `${task.created_by} sana görev atadı: ${task.title}`,
        data: { screen: 'task', id: task.id },
        type: 'task_assigned',
        workspace_id: '9bf0a8cd-c704-4800-991a-cecb2453b42d',
      },
    });

    if (error) console.error('Push trigger error:', error);

    // Acil görevlerde ek olarak SMS gönder
    if (isUrgent) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', member.user_id)
        .single();

      if (profile?.phone) {
        await supabase.functions.invoke('send-sms', {
          body: {
            phone: profile.phone,
            message: `⚠️ ACİL GÖREV: ${task.title} — ${task.created_by} tarafından atandı. VOXI uygulamasını aç.`,
            message_type: 'urgent_task',
            workspace_id: '9bf0a8cd-c704-4800-991a-cecb2453b42d',
          },
        });
      }
    }
  } catch (error) {
    console.error('Push trigger failed:', error);
  }
}

export async function triggerTaskCompletedPush(task: {
  id: string;
  title: string;
  completed_by: string;
  created_by: string;
}) {
  try {
    // Görevi oluşturana bildir
    const { data: creator } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', '9bf0a8cd-c704-4800-991a-cecb2453b42d')
      .ilike('profiles.first_name', `%${task.created_by.split(' ')[0]}%`)
      .limit(1)
      .single();

    if (!creator?.user_id) return;

    await supabase.functions.invoke('send-push', {
      body: {
        user_ids: [creator.user_id],
        title: 'Görev Tamamlandı ✅',
        body: `${task.completed_by} tamamladı: ${task.title}`,
        data: { screen: 'task', id: task.id },
        type: 'task_completed',
      },
    });
  } catch (error) {
    console.error('Push trigger failed:', error);
  }
}
