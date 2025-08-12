import React, { createContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState(systemColorScheme || 'light'); // Default to system or light

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('appTheme');
        if (savedTheme) {
          setTheme(savedTheme);
        }
      } catch (error) {
        console.error('Failed to load theme from storage', error);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem('appTheme', newTheme);
    } catch (error) {
      console.error('Failed to save theme to storage', error);
    }
  };

  const isDarkMode = theme === 'dark';

  const colors = {
    background: isDarkMode ? '#1a1a1a' : '#f0f0f0',
    cardBackground: isDarkMode ? '#333333' : 'white',
    text: isDarkMode ? 'white' : '#333333',
    subtleText: isDarkMode ? '#cccccc' : '#666666',
    border: isDarkMode ? '#555555' : '#cccccc',
    primary: '#007bff', // Keep primary color consistent
    danger: '#dc3545',   // Keep danger color consistent
    success: '#28a745',  // Keep success color consistent
    buttonBackground: isDarkMode ? '#555555' : '#007bff',
    buttonText: 'white',
    inputBackground: isDarkMode ? '#444444' : 'white',
    inputBorder: isDarkMode ? '#777777' : '#ccc',
    activeTab: isDarkMode ? '#0056b3' : '#007bff',
    inactiveTab: isDarkMode ? '#aaaaaa' : 'gray',
    headerBackground: isDarkMode ? '#222222' : 'white',
    // Specific for player circles
    playerCircleBackground: isDarkMode ? '#556B2F' : '#ADD8E6', // Darker green for dark mode
    playerCircleBorder: isDarkMode ? '#8FBC8F' : '#666',
    servingPlayerCircleBackground: isDarkMode ? '#6B8E23' : '#4CAF50', // More vibrant green for serving
    servingPlayerCircleBorder: isDarkMode ? '#9ACD32' : '#2E8B57',
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDarkMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};