// PlayersAndCoachesScreen.jsx
import React, { useState, useEffect, useReducer, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert, SafeAreaView, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// Reducer para gestionar el estado de jugadores y entrenadores
const playersCoachesReducer = (state, action) => {
  switch (action.type) {
    case 'LOAD_DATA':
      return action.payload;
    case 'ADD_PLAYER':
      return {
        ...state,
        [action.payload.teamKey]: {
          ...state[action.payload.teamKey],
          players: [...state[action.payload.teamKey].players, action.payload.player],
        },
      };
    case 'REMOVE_PLAYER':
      return {
        ...state,
        [action.payload.teamKey]: {
          ...state[action.payload.teamKey],
          players: state[action.payload.teamKey].players.filter(
            (player, index) => index !== action.payload.index
          ),
        },
      };
    case 'ADD_COACH':
      return {
        ...state,
        [action.payload.teamKey]: {
          ...state[action.payload.teamKey],
          coaches: [...state[action.payload.teamKey].coaches, action.payload.coach],
        },
      };
    case 'REMOVE_COACH':
      return {
        ...state,
        [action.payload.teamKey]: {
          ...state[action.payload.teamKey],
          coaches: state[action.payload.teamKey].coaches.filter(
            (coach, index) => index !== action.payload.index
          ),
        },
      };
    case 'UPDATE_TEAM_NAME':
      const { oldTeamKey, newTeamName } = action.payload;
      const newState = { ...state };
      if (newState[oldTeamKey]) {
        const teamData = newState[oldTeamKey];
        delete newState[oldTeamKey]; // Elimina la clave antigua
        newState[newTeamName] = { ...teamData, name: newTeamName }; // Añade con la nueva clave y nombre
      }
      return newState;
    default:
      return state;
  }
};

const PlayersAndCoachesScreen = ({ navigation }) => {
  const [team1Name, setTeam1Name] = useState('EQUIPO 1');
  const [team2Name, setTeam2Name] = useState('EQUIPO 2');

  const [state, dispatch] = useReducer(playersCoachesReducer, {
    [team1Name]: { name: team1Name, players: [], coaches: [] },
    [team2Name]: { name: team2Name, players: [], coaches: [] },
  });

  const [newPlayerName, setNewPlayerName] = useState('');
  const [newCoachName, setNewCoachName] = useState('');
  const [selectedTeamKey, setSelectedTeamKey] = useState(team1Name); // Para saber a qué equipo añadir

  // Cargar los nombres de los equipos desde AsyncStorage al inicio
  useEffect(() => {
    const loadTeamNames = async () => {
      try {
        const savedStateJSON = await AsyncStorage.getItem('gameState');
        if (savedStateJSON) {
          const savedState = JSON.parse(savedStateJSON);
          const t1Name = savedState.team1Name || 'EQUIPO 1';
          const t2Name = savedState.team2Name || 'EQUIPO 2';
          setTeam1Name(t1Name);
          setTeam2Name(t2Name);
          setSelectedTeamKey(t1Name); // Asegurarse de que el equipo seleccionado sea el correcto
        }
      } catch (error) {
        console.error('Error al cargar nombres de equipo:', error);
      }
    };
    loadTeamNames();
  }, []);

  // Cargar datos de jugadores y entrenadores al iniciar la pantalla
  useEffect(() => {
    const loadPlayersAndCoaches = async () => {
      try {
        const dataJSON = await AsyncStorage.getItem('playersCoachesData');
        if (dataJSON) {
          const loadedData = JSON.parse(dataJSON);
          // Asegurarse de que los nombres de equipo en el estado coincidan con los cargados
          const updatedState = {};
          // Si los nombres de equipo han cambiado desde la última vez que se guardó,
          // necesitamos actualizar las claves en el estado.
          if (loadedData[team1Name] || loadedData[team2Name]) {
             // Si ya existen las claves con los nombres actuales, usarlas directamente
             dispatch({ type: 'LOAD_DATA', payload: loadedData });
          } else {
            // Si no, intentar mapear las claves antiguas a las nuevas
            const oldTeam1Key = Object.keys(loadedData).find(key => loadedData[key].name === team1Name);
            const oldTeam2Key = Object.keys(loadedData).find(key => loadedData[key].name === team2Name);

            if (oldTeam1Key && loadedData[oldTeam1Key]) {
                updatedState[team1Name] = { ...loadedData[oldTeam1Key], name: team1Name };
            } else {
                updatedState[team1Name] = { name: team1Name, players: [], coaches: [] };
            }

            if (oldTeam2Key && loadedData[oldTeam2Key]) {
                updatedState[team2Name] = { ...loadedData[oldTeam2Key], name: team2Name };
            } else {
                updatedState[team2Name] = { name: team2Name, players: [], coaches: [] };
            }
            dispatch({ type: 'LOAD_DATA', payload: updatedState });
          }
        } else {
            // Si no hay datos guardados, inicializar con los nombres de equipo actuales
            dispatch({ type: 'LOAD_DATA', payload: {
                [team1Name]: { name: team1Name, players: [], coaches: [] },
                [team2Name]: { name: team2Name, players: [], coaches: [] },
            }});
        }
      } catch (error) {
        console.error('Error al cargar jugadores y entrenadores:', error);
      }
    };
    loadPlayersAndCoaches();
  }, [team1Name, team2Name]); // Recargar si los nombres de equipo cambian

  // Guardar datos cada vez que el estado cambia
  useEffect(() => {
    const savePlayersAndCoaches = async () => {
      try {
        await AsyncStorage.setItem('playersCoachesData', JSON.stringify(state));
      } catch (error) {
        console.error('Error al guardar jugadores y entrenadores:', error);
      }
    };
    savePlayersAndCoaches();
  }, [state]);

  // Manejar cambios en los nombres de equipo desde VolleyballScoreApp
  useEffect(() => {
    // Si los nombres de equipo cambian, actualizamos las claves en el estado
    const currentTeamKeys = Object.keys(state);
    if (!currentTeamKeys.includes(team1Name) || !currentTeamKeys.includes(team2Name)) {
        const newState = {};
        // Transferir datos del equipo 1
        const oldTeam1Key = currentTeamKeys.find(key => state[key].name === team1Name);
        if (oldTeam1Key && state[oldTeam1Key]) {
            newState[team1Name] = { ...state[oldTeam1Key], name: team1Name };
        } else if (state[team1Name]) { // Si ya existe la clave actual
            newState[team1Name] = state[team1Name];
        } else {
            newState[team1Name] = { name: team1Name, players: [], coaches: [] };
        }

        // Transferir datos del equipo 2
        const oldTeam2Key = currentTeamKeys.find(key => state[key].name === team2Name);
        if (oldTeam2Key && state[oldTeam2Key]) {
            newState[team2Name] = { ...state[oldTeam2Key], name: team2Name };
        } else if (state[team2Name]) { // Si ya existe la clave actual
            newState[team2Name] = state[team2Name];
        } else {
            newState[team2Name] = { name: team2Name, players: [], coaches: [] };
        }

        // Eliminar claves antiguas que ya no corresponden a ningún equipo
        currentTeamKeys.forEach(key => {
            if (key !== team1Name && key !== team2Name && !Object.values(newState).some(t => t.name === state[key].name)) {
                // Si la clave antigua no es ni team1Name ni team2Name y su nombre no está en newState, eliminarla
            }
        });

        dispatch({ type: 'LOAD_DATA', payload: newState });
        setSelectedTeamKey(team1Name); // Resetear a Equipo 1 por defecto
    }
  }, [team1Name, team2Name]);


  const addPlayer = useCallback(() => {
    if (newPlayerName.trim()) {
      dispatch({ type: 'ADD_PLAYER', payload: { teamKey: selectedTeamKey, player: newPlayerName.trim() } });
      setNewPlayerName('');
    }
  }, [newPlayerName, selectedTeamKey]);

  const removePlayer = useCallback((index) => {
    Alert.alert(
      "Eliminar Jugador",
      "¿Estás seguro de que quieres eliminar a este jugador?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", onPress: () => dispatch({ type: 'REMOVE_PLAYER', payload: { teamKey: selectedTeamKey, index } }), style: "destructive" },
      ]
    );
  }, [selectedTeamKey]);

  const addCoach = useCallback(() => {
    if (newCoachName.trim()) {
      dispatch({ type: 'ADD_COACH', payload: { teamKey: selectedTeamKey, coach: newCoachName.trim() } });
      setNewCoachName('');
    }
  }, [newCoachName, selectedTeamKey]);

  const removeCoach = useCallback((index) => {
    Alert.alert(
      "Eliminar Entrenador",
      "¿Estás seguro de que quieres eliminar a este entrenador?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", onPress: () => dispatch({ type: 'REMOVE_COACH', payload: { teamKey: selectedTeamKey, index } }), style: "destructive" },
      ]
    );
  }, [selectedTeamKey]);

  const renderItem = ({ item, index }) => (
    <View style={styles.listItem}>
      <Text style={styles.listItemText}>{item}</Text>
      <TouchableOpacity onPress={() => {
        if (state[selectedTeamKey].players.includes(item)) {
          removePlayer(index);
        } else if (state[selectedTeamKey].coaches.includes(item)) {
          removeCoach(index);
        }
      }}>
        <Ionicons name="close-circle" size={24} color="#dc3545"/>
      </TouchableOpacity>
    </View>
  );

  const currentTeamData = state[selectedTeamKey] || { name: selectedTeamKey, players: [], coaches: [] };

  return (
    <SafeAreaView style={styles.container}>
    <StatusBar style="auto"/>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#007bff"/>
        </TouchableOpacity>
        <Text style={styles.title}>Equipos</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.teamSelector}>
          <TouchableOpacity
            style={[styles.teamButton, selectedTeamKey === team1Name && styles.selectedTeamButton]}
            onPress={() => setSelectedTeamKey(team1Name)}
          >
            <Text
              style={[styles.teamButtonText, selectedTeamKey === team1Name && styles.selectedTeamButtonText]}
              numberOfLines={1}
            >
              {team1Name}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.teamButton, selectedTeamKey === team2Name && styles.selectedTeamButton]}
            onPress={() => setSelectedTeamKey(team2Name)}
          >
            <Text style={[styles.teamButtonText, selectedTeamKey === team2Name && styles.selectedTeamButtonText]} numberOfLines={1}>
              {team2Name}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Jugadores de {currentTeamData.name}</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Nombre del jugador"
              value={newPlayerName}
              onChangeText={setNewPlayerName}
              onSubmitEditing={addPlayer}
            />
            <TouchableOpacity style={styles.addButton} onPress={addPlayer}>
              <Ionicons name="add-circle" size={30} color="#28a745"/>
            </TouchableOpacity>
          </View>
          <FlatList
            data={currentTeamData.players}
            renderItem={renderItem}
            keyExtractor={(item, index) => `player-${index}`}
            ListEmptyComponent={<Text style={styles.emptyListText}>No hay jugadores registrados.</Text>}
            scrollEnabled={false}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Entrenadores de {currentTeamData.name}</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Nombre del entrenador"
              value={newCoachName}
              onChangeText={setNewCoachName}
              onSubmitEditing={addCoach}
            />
            <TouchableOpacity style={styles.addButton} onPress={addCoach}>
              <Ionicons name="add-circle" size={30} color="#28a745"/>
            </TouchableOpacity>
          </View>
          <FlatList
            data={currentTeamData.coaches}
            renderItem={renderItem}
            keyExtractor={(item, index) => `coach-${index}`}
            ListEmptyComponent={<Text style={styles.emptyListText}>No hay entrenadores registrados.</Text>}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  scrollViewContent: {
    paddingBottom: 20, // Espacio al final para que el contenido no quede pegado
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  teamSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: '#e9ecef',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  teamButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#dee2e6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedTeamButton: {
    backgroundColor: '#007bff',
  },
  teamButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  selectedTeamButtonText: {
    color: 'white',
  },
  section: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginRight: 10,
    backgroundColor: 'white',
  },
  addButton: {
    padding: 5,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  listItemText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
});

export default PlayersAndCoachesScreen;