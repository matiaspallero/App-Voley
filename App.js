import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import VolleyballScoreApp from './screens/home/VolleyballScoreApp';
import HistoryScreen from './screens/history/HistoryScreen';
import PlayersAndCoachesScreen from './screens/players/PlayersAndCoachesScreen';
import Entrada from './screens/Bienvenida/Entrada';
import { setAudioModeAsync } from 'expo-audio';

const Tab = createBottomTabNavigator();

// Hook para manejar el tema
const useTheme = () => {
  const systemTheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemTheme === 'dark');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('AppTheme');
        if (savedTheme) {
          setIsDarkMode(savedTheme === 'dark');
        } else {
          // Si no hay tema guardado, usar el tema del sistema
          setIsDarkMode(systemTheme === 'dark');
        }
      } catch (error) {
        console.log('Error loading theme:', error);
        // En caso de error, usar el tema del sistema
        setIsDarkMode(systemTheme === 'dark');
      }
    };
    loadTheme();
  }, []);

  // Efecto para detectar cambios en el tema del sistema
  useEffect(() => {
    const checkSystemTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('AppTheme');
        if (!savedTheme) {
          // Solo cambiar si no hay tema manual guardado
          setIsDarkMode(systemTheme === 'dark');
        }
      } catch (error) {
        console.error('Error checking system theme:', error);
      }
    };
    checkSystemTheme();
  }, [systemTheme]);
  
  return { isDarkMode };
};

// Temas personalizados para la navegación con paleta estandarizada
const CustomLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#f0f0f0',
    card: '#ffffff',
    text: '#333333',
    border: '#cccccc',
    primary: '#007bff',
  },
};

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#11161cff',
    card: '#1a212aff',
    text: '#ffffff',
    border: '#2d3748',
    primary: '#4a9eff',
  },
};

export default function App() {
  const [checkingWelcome, setCheckingWelcome] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const { isDarkMode } = useTheme();

  // Crear estilos de navegación basados en el tema
  const navigationTheme = useMemo(() => {
    return isDarkMode ? CustomDarkTheme : CustomLightTheme;
  }, [isDarkMode]);

  // Colores dinámicos para los tabs
  const tabBarColors = useMemo(() => ({
    activeTintColor: isDarkMode ? '#4a9eff' : '#007bff',
    inactiveTintColor: isDarkMode ? '#888888' : 'gray',
    tabBarStyle: {
      backgroundColor: isDarkMode ? '#1a212aff' : '#ffffff',
      borderTopColor: isDarkMode ? '#404040' : '#cccccc',
    },
  }), [isDarkMode]);

  // Mostrar SIEMPRE la bienvenida en cada arranque (ignora AsyncStorage)
  useEffect(() => {
    (async () => {
      setShowWelcome(true);
      setCheckingWelcome(false);
      try {
        await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
      } catch (e) {
        console.warn('No se pudo configurar modo audio', e);
      }
    })();
  }, []);

  const handleFinishWelcome = useCallback(() => setShowWelcome(false), []);

  if (checkingWelcome) return null; // Expo splash cubrirá este estado.

  return (
    <SafeAreaProvider>
        {showWelcome ? (
          <Entrada onFinish={handleFinishWelcome} />
        ) : (
          <NavigationContainer theme={navigationTheme}>
            <Tab.Navigator
              screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                  let iconName;
                  if (route.name === 'Marcador') iconName = focused ? 'clipboard' : 'clipboard-outline';
                  else if (route.name === 'Historial') iconName = focused ? 'time' : 'time-outline';
                  else if (route.name === 'Equipos') iconName = focused ? 'people' : 'people-outline';
                  return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: tabBarColors.activeTintColor,
                tabBarInactiveTintColor: tabBarColors.inactiveTintColor,
                tabBarStyle: tabBarColors.tabBarStyle,
                headerShown: false,
              })}
            >
              <Tab.Screen name="Marcador" component={VolleyballScoreApp} />
              <Tab.Screen name="Equipos" component={PlayersAndCoachesScreen} />
              <Tab.Screen name="Historial" component={HistoryScreen} />
            </Tab.Navigator>
          </NavigationContainer>
        )}
    </SafeAreaProvider>
  );
}