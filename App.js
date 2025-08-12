import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import VolleyballScoreApp from './screens/home/VolleyballScoreApp'; // Asegúrate de que la ruta sea correcta
import HistoryScreen from './screens/history/HistoryScreen'; // Asegúrate de que la ruta sea correcta
import PlayersAndCoachesScreen from './screens/players/PlayersAndCoachesScreen'; // ¡Importa la nueva pantalla!

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;

              if (route.name === 'Marcador') {
                iconName = focused ? 'clipboard' : 'clipboard-outline';
              } else if (route.name === 'Historial') {
                iconName = focused ? 'time' : 'time-outline';
              } else if (route.name === 'Equipos') { // Nueva pestaña para Equipos
                iconName = focused ? 'people' : 'people-outline';
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#007bff',
            tabBarInactiveTintColor: 'gray',
            headerShown: false, // Ocultamos el header por defecto
          })}
        >
          <Tab.Screen name="Marcador" component={VolleyballScoreApp} />
          <Tab.Screen name="Equipos" component={PlayersAndCoachesScreen} />
          <Tab.Screen name="Historial" component={HistoryScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}