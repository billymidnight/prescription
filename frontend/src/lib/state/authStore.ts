import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import supabase from '../supabaseClient';

interface User {
  user_id: string;
  email: string;
  username?: string;
  role?: string;
  approved?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  logout: () => void;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      accessToken: null,
      
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setAccessToken: (token) => set({ accessToken: token }),
      
      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, isAuthenticated: false, accessToken: null });
      },
      
      initializeAuth: async () => {
        try {
          const { data } = await supabase.auth.getSession();
          const session = data?.session;
          
          if (session && session.user) {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
            
            // Call backend to ensure user row exists in custom users table
            try {
              const createResponse = await fetch(`${apiBase}/auth/create_user`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json', 
                  'Authorization': `Bearer ${session.access_token}` 
                },
                body: JSON.stringify({ email: session.user.email }),
              });
              const createData = await createResponse.json();
              console.log('🔐 [authStore.initializeAuth] create_user response:', createData);
            } catch (err) {
              console.warn('⚠️ create_user call failed during init', err);
            }

            // Fetch user details including role from backend
            try {
              const meResponse = await fetch(`${apiBase}/auth/me`, {
                method: 'GET',
                headers: { 
                  'Authorization': `Bearer ${session.access_token}` 
                },
              });
              
              if (meResponse.ok) {
                const userData = await meResponse.json();
                console.log('✅ [authStore.initializeAuth] User data fetched:', userData);
                console.log('📧 EMAIL:', userData.email);
                console.log('👤 ROLE:', userData.role);
                
                set({ 
                  accessToken: session.access_token,
                  user: {
                    user_id: session.user.id,
                    email: userData.email || session.user.email || '',
                    username: userData.screenname || session.user.email?.split('@')[0],
                    role: userData.role,
                    approved: userData.approved,
                  },
                  isAuthenticated: true
                });
              } else {
                console.error('❌ Failed to fetch user data:', meResponse.status);
                // Fallback without role
                set({ 
                  accessToken: session.access_token,
                  user: {
                    user_id: session.user.id,
                    email: session.user.email || '',
                    username: session.user.email?.split('@')[0],
                    role: 'STAFF', // Default fallback
                    approved: false,
                  },
                  isAuthenticated: true
                });
              }
            } catch (err) {
              console.error('❌ Error fetching user details:', err);
              // Fallback without role
              set({ 
                accessToken: session.access_token,
                user: {
                  user_id: session.user.id,
                  email: session.user.email || '',
                  username: session.user.email?.split('@')[0],
                  role: 'STAFF', // Default fallback
                  approved: false,
                },
                isAuthenticated: true
              });
            }
          }
          
          // Listen to auth changes
          supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session && session.user) {
              const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
              
              // Call backend to ensure user row exists
              try {
                const createResponse = await fetch(`${apiBase}/auth/create_user`, {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${session.access_token}` 
                  },
                  body: JSON.stringify({ email: session.user.email }),
                });
                const createData = await createResponse.json();
                console.log('🔐 [authStore.onAuthStateChange] create_user response:', createData);
              } catch (err) {
                console.warn('⚠️ create_user call failed during auth change', err);
              }

              // Fetch user details including role from backend
              try {
                const meResponse = await fetch(`${apiBase}/auth/me`, {
                  method: 'GET',
                  headers: { 
                    'Authorization': `Bearer ${session.access_token}` 
                  },
                });
                
                if (meResponse.ok) {
                  const userData = await meResponse.json();
                  console.log('✅ [authStore.onAuthStateChange] User data fetched:', userData);
                  console.log('📧 EMAIL:', userData.email);
                  console.log('👤 ROLE:', userData.role);
                  
                  set({ 
                    accessToken: session.access_token,
                    user: {
                      user_id: session.user.id,
                      email: userData.email || session.user.email || '',
                      username: userData.screenname || session.user.email?.split('@')[0],
                      role: userData.role,
                      approved: userData.approved,
                    },
                    isAuthenticated: true
                  });
                } else {
                  console.error('❌ Failed to fetch user data:', meResponse.status);
                  set({ 
                    accessToken: session.access_token,
                    user: {
                      user_id: session.user.id,
                      email: session.user.email || '',
                      username: session.user.email?.split('@')[0],
                      role: 'STAFF',
                      approved: false,
                    },
                    isAuthenticated: true
                  });
                }
              } catch (err) {
                console.error('❌ Error fetching user details:', err);
                set({ 
                  accessToken: session.access_token,
                  user: {
                    user_id: session.user.id,
                    email: session.user.email || '',
                    username: session.user.email?.split('@')[0],
                    role: 'STAFF',
                    approved: false,
                  },
                  isAuthenticated: true
                });
              }
            } else {
              set({ user: null, isAuthenticated: false, accessToken: null });
            }
          });
        } catch (error) {
          console.error('Auth initialization error:', error);
        }
      }
    }),
    {
      name: 'auth-storage',
    }
  )
);
