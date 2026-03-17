import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { register as apiRegister, login as apiLogin, getCurrentUser, logout as apiLogout } from '../lib/auth';
import { useAppStore } from '../store/useAppStore';

export function useAuth() {
  const queryClient = useQueryClient();
  const { setUser, logout: storeLogout } = useAppStore();

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    retry: false,
    // Cookie is sent automatically, no need to check localStorage
    enabled: true,
  });

  const registerMutation = useMutation({
    mutationFn: ({ email, password, role }: { email: string; password: string; role: 'senior' | 'family' }) =>
      apiRegister(email, password, role),
    onSuccess: (data) => {
      if (data.success && data.user) {
        setUser(data.user);
        queryClient.setQueryData(['currentUser'], data);
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      apiLogin(email, password),
    onSuccess: (data) => {
      if (data.success && data.user) {
        setUser(data.user);
        queryClient.setQueryData(['currentUser'], data);
      }
    },
  });

  const logout = async () => {
    await apiLogout();
    storeLogout();
    queryClient.clear();
  };

  return {
    user: user?.user,
    isLoading,
    isAuthenticated: !!user?.user,
    register: registerMutation.mutate,
    login: loginMutation.mutate,
    logout,
    registerError: registerMutation.error,
    loginError: loginMutation.error,
    isRegistering: registerMutation.isPending,
    isLoggingIn: loginMutation.isPending,
  };
}
