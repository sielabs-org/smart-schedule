import React, { createContext, useContext, useState } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

const toAuthenticatedUser = (user) => ({
  id: user.id,
  role: user.role,
  name: user.name,
  email: user.email,
  department: user.department,
  teacher: user.teacher || null,
  division: user.division || null,
  isDemo: false
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('smart_schedule_user');

    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (error) {
        localStorage.removeItem('smart_schedule_user');
        return null;
      }
    }

    return null;
  });

  const [isAuthLoading, setIsAuthLoading] = useState(() =>
    Boolean(
      localStorage.getItem('token') ||
      localStorage.getItem('smart_schedule_user')
    )
  );

  // Authenticate through the backend API.
  const login = async (email, password, expectedRole) => {
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const response = await api.post('/auth/login', {
        email: normalizedEmail,
        password
      });

      const authenticatedUser = response.user;

      if (!authenticatedUser) {
        throw new Error(
          'Login response did not include user information.'
        );
      }

      if (expectedRole && authenticatedUser.role !== expectedRole) {
        throw new Error(
          `This account is registered as ${authenticatedUser.role}, not ${expectedRole}.`
        );
      }

      if (!response.token) {
        throw new Error(
          'Login response did not include an authentication token.'
        );
      }

      localStorage.setItem('token', response.token);

      const newUser = toAuthenticatedUser(authenticatedUser);

      setUser(newUser);

      localStorage.setItem(
        'smart_schedule_user',
        JSON.stringify(newUser)
      );

      return newUser;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  // Log out the current user.
  const logout = () => {
    setUser(null);
    localStorage.removeItem('smart_schedule_user');
    localStorage.removeItem('token');
  };

  // Verify an existing session with the backend.
  React.useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      setUser(null);
      localStorage.removeItem('smart_schedule_user');
      setIsAuthLoading(false);
      return;
    }

    api.get('/auth/me')
      .then((response) => {
        if (!response.user) {
          throw new Error(
            'Session verification did not return user information.'
          );
        }

        const authenticatedUser = toAuthenticatedUser(response.user);

        setUser(authenticatedUser);

        localStorage.setItem(
          'smart_schedule_user',
          JSON.stringify(authenticatedUser)
        );
      })
      .catch((error) => {
        console.error('Session verification failed:', error);
        logout();
      })
      .finally(() => {
        setIsAuthLoading(false);
      });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        isDemo: false,
        isAuthLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return context;
};