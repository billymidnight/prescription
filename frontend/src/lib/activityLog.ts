import supabase from './supabaseClient';
import { useAuthStore } from './state/authStore';

/**
 * Log an activity to the activity_logs table
 * @param action - Description of the action performed
 */
export async function logActivity(action: string): Promise<void> {
  try {
    const session = await supabase.auth.getSession();
    const userId = session?.data?.session?.user?.id;

    if (!userId) {
      console.warn('Cannot log activity: No authenticated user');
      return;
    }

    const { error } = await supabase
      .from('activity_logs')
      .insert({
        user_uuid: userId,
        action: action,
      });

    if (error) {
      console.error('Failed to log activity:', error);
    }
  } catch (err) {
    console.error('Error logging activity:', err);
  }
}
