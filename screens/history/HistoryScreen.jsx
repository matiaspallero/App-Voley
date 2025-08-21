import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, SafeAreaView, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

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

  // Paleta de colores estandarizada para modo claro y oscuro
  const colors = {
    // Fondos principales
    background: isDarkMode ? '#11161cff' : '#f0f0f0',
    cardBackground: isDarkMode ? '#1a212aff' : '#ffffff',
    headerBackground: isDarkMode ? '#1a212aff' : '#ffffff',
    expandedBackground: isDarkMode ? '#11161cff' : '#fafafa',
    
    // Textos
    text: isDarkMode ? '#ffffff' : '#333333',
    textSecondary: isDarkMode ? '#b6c8d8' : '#666666',
    textTertiary: isDarkMode ? '#8a9ba8' : '#888888',
    
    // Bordes y divisores
    border: isDarkMode ? '#2d3748' : '#cccccc',
    divider: isDarkMode ? '#2d3748' : '#cccccc',
    
    // Botones y acciones
    buttonPrimary: isDarkMode ? '#4a9eff' : '#007bff',
    danger: isDarkMode ? '#f44336' : '#dc3545',
    success: isDarkMode ? '#4caf50' : '#28a745',
    
    // Sombras
    shadowColor: isDarkMode ? '#000000' : '#000000',
  };

  return { isDarkMode, colors };
};

const HistoryScreen = ({ navigation }) => {
  const { isDarkMode, colors } = useTheme();
  
  // Crear estilos dinámicos basados en el tema
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [history, setHistory] = useState([]);
  const [expandedMatchId, setExpandedMatchId] = useState(null);

  const loadHistory = async () => {
    try {
      const historyJSON = await AsyncStorage.getItem('matchHistory');
      if (historyJSON !== null) {
        setHistory(JSON.parse(historyJSON));
      }
    } catch (error) {
      console.error('Failed to load match history', error);
    }
  };

  // useFocusEffect para recargar los datos cuando la pantalla obtiene el foco
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem('matchHistory');
      setHistory([]); // Limpia el estado para reflejar el cambio en la UI
    } catch (error) {
      console.error('Failed to clear match history', error);
      Alert.alert("Error", "No se pudo borrar el historial.");
    }
  };

  const confirmClearHistory = () => {
    Alert.alert(
      "Borrar Historial",
      "¿Estás seguro de que quieres borrar todos los partidos? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Sí, Borrar", onPress: clearHistory, style: "destructive" },
      ]
    );
  };

  const deleteMatch = async (matchId) => {
    try {
      const newHistory = history.filter(match => match.id !== matchId);
      await AsyncStorage.setItem('matchHistory', JSON.stringify(newHistory));
      setHistory(newHistory);
    } catch (error) {
      console.error('Failed to delete match', error);
      Alert.alert("Error", "No se pudo borrar el partido.");
    }
  };

  const confirmDeleteMatch = (matchId) => {
    Alert.alert("Borrar Partido", "¿Estás seguro de que quieres borrar este partido?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sí, Borrar", onPress: () => deleteMatch(matchId), style: "destructive" },
    ]);
  };

  const toggleExpand = (matchId) => {
    setExpandedMatchId(expandedMatchId === matchId ? null : matchId);
  };

  const renderMatchItem = ({ item }) => {
    const isExpanded = expandedMatchId === item.id;

    return (
      <View style={styles.matchItemContainer}>
        <TouchableOpacity onPress={() => toggleExpand(item.id)} style={styles.matchSummary}>
          <View style={styles.teamInfo}>
            <Text style={[styles.teamName, item.winner === item.team1Name && styles.winnerName]}>
              {item.team1Name}
            </Text>
            <Text style={[styles.setScore, item.winner === item.team1Name && styles.winnerScore]}>
              {item.setsTeam1}
            </Text>
          </View>
          <Text style={styles.vsText}>-</Text>
          <View style={styles.teamInfo}>
            <Text style={[styles.setScore, item.winner === item.team2Name && styles.winnerScore]}>
              {item.setsTeam2}
            </Text>
            <Text style={[styles.teamName, item.winner === item.team2Name && styles.winnerName, { textAlign: 'right' }]}>
              {item.team2Name}
            </Text>
          </View>
          <Text style={styles.dateText}>{new Date(item.date).toLocaleDateString()}</Text>
        </TouchableOpacity>

        {isExpanded && item.setScores && item.setScores.length > 0 && (
          <View style={styles.setDetailsContainer}>
            {item.setScores.map((score, index) => (
              <View key={index} style={styles.setDetailRow}>
                <Text style={styles.setDetailText}>Set {index + 1}:</Text>
                <Text style={styles.setDetailScore}>{score.team1} - {score.team2}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDeleteMatch(item.id)}>
              <Ionicons name="trash-outline" size={20} color={colors.danger}/>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'}/>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={colors.buttonPrimary}/>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de Partidos</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={confirmClearHistory}>
            <Ionicons name="trash-outline" size={24} color={colors.danger}/>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={history}
        renderItem={renderMatchItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={<Text style={styles.emptyText}>No hay partidos en el historial.</Text>}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
};

// Función para crear estilos dinámicos basados en el tema
const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: colors.headerBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  listContainer: {
    padding: 10,
  },
  matchItemContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    overflow: 'hidden',
  },
  matchSummary: {
    padding: 15,
    paddingBottom: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  teamInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamName: {
    fontSize: 16,
    flex: 1,
    color: colors.text,
  },
  winnerName: {
    fontWeight: 'bold',
  },
  setScore: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 10,
    color: colors.text,
  },
  winnerScore: {
    color: colors.success,
  },
  vsText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 10,
    color: colors.text,
  },
  dateText: {
    position: 'absolute',
    bottom: 5,
    right: 15,
    fontSize: 12,
    color: colors.textTertiary,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: colors.textSecondary,
  },
  setDetailsContainer: {
    paddingHorizontal: 15,
    paddingBottom: 25,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.expandedBackground,
  },
  setDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  setDetailText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  setDetailScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  deleteButton: {
    position: 'absolute',
    bottom: 0,
    right: 15,
    padding: 5,
  },
});

export default HistoryScreen;