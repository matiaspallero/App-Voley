import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const HistoryScreen = ({ navigation }) => {
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
              <Ionicons name="trash-outline" size={20} color="#dc3545"/>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto"/>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#007bff"/>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de Partidos</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={confirmClearHistory}>
            <Ionicons name="trash-outline" size={24} color="#dc3545"/>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 10,
  },
  matchItemContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    overflow: 'hidden', // Asegura que el borde redondeado se aplique a los hijos
  },
  matchSummary: {
    padding: 15,
    paddingBottom: 25, // Espacio extra para la fecha
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
  },
  winnerName: {
  fontWeight: 'bold',
  },
  setScore: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  winnerScore: {
    color: '#28a745', // Verde para el ganador
  },
  vsText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  dateText: {
    position: 'absolute',
    bottom: 5,
    right: 15,
    fontSize: 12,
    color: '#888',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
  setDetailsContainer: {
    paddingHorizontal: 15,
    paddingBottom: 25,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fafafa',
  },
  setDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  setDetailText: {
    fontSize: 14,
    color: '#555',
  },
  setDetailScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  deleteButton: {
    position: 'absolute',
    bottom: 0,
    right: 15,
    padding: 5,
  },
});

export default HistoryScreen;