import { useEffect } from 'react';
import { useStatsigUser } from '@statsig/react-bindings';
import { useAuth } from '../context/AuthContext';

export const useSyncStatsigUser = () => {
  const { user } = useAuth();
  const { updateUserAsync } = useStatsigUser();

  useEffect(() => {
    if (user) {
      updateUserAsync({
        userID: user._id,
        email: user.email,
        custom: {
          role: user.role,
          authProvider: user.authProvider,
        },
      });
    } else {
      updateUserAsync({ userID: 'anonymous' });
    }
  }, [user, updateUserAsync]);
};
