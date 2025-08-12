import React, { useReducer, useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, TextInput, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { ActionTypes } from './Constants';
import { useTimer } from '../../hooks/useTimer';
import { useCountdown } from '../../hooks/useCountdown';
import { useSound } from '../../hooks/useSound';


// 1. Estado Inicial
const initialState = {
  scoreTeam1: 0,
  scoreTeam2: 0,
  setsTeam1: 0,
  setsTeam2: 0,
  team1Name: 'EQUIPO 1',
  team2Name: 'EQUIPO 2',
  team1Color: '#007bff', // Default color for Team 1
  team2Color: '#dc3545', // Default color for Team 2
  setScoresHistory: [],
  servingTeam: 1,
  timeoutsTeam1: 2,
  timeoutsTeam2: 2,
  setsToWin: 3, // Por defecto: al mejor de 5 (gana 3)
  isSettingsModalVisible: false,
  // --- NUEVAS PROPIEDADES PARA LA ROTACIÓN ---
  team1Rotation: [1, 2, 3, 4, 5, 6], // Representa los números de los jugadores en la rotación (P1, P2, P3, P4, P5, P6)
  team2Rotation: [1, 2, 3, 4, 5, 6],
  team1CurrentServePosition: 1, // Posición del jugador que debería sacar actualmente (el que está en la posición 1 de rotación)
  team2CurrentServePosition: 1,
};

// 2. Reducer (sin cambios relevantes para este ajuste de UI)
function gameReducer(state, action) {
  switch (action.type) {
    case ActionTypes.ADD_POINT: {
      const { team } = action.payload;
      let newState = {
        ...state,
        scoreTeam1: team === 1 ? state.scoreTeam1 + 1 : state.scoreTeam1,
        scoreTeam2: team === 2 ? state.scoreTeam2 + 1 : state.scoreTeam2,
      };

      // Lógica de rotación si hay un "side out"
      const previousServingTeam = state.servingTeam;
      const newServingTeam = team;

      if (newServingTeam !== previousServingTeam) {
        newState.servingTeam = newServingTeam; // El equipo que anota es el nuevo equipo que sirve
        if (newServingTeam === 1) {
          // Rotar jugadores del Equipo 1 y actualizar la posición de saque
          const rotatedTeam1 = [...newState.team1Rotation];
          const playerToMove = rotatedTeam1.pop(); // Saca el último (posición 6)
          rotatedTeam1.unshift(playerToMove); // Lo pone al principio (posición 1)
          newState.team1Rotation = rotatedTeam1;
          // newState.team1CurrentServePosition se actualizará automáticamente con la primera posición
        } else if (newServingTeam === 2) {
          // Rotar jugadores del Equipo 2 y actualizar la posición de saque
          const rotatedTeam2 = [...newState.team2Rotation];
          const playerToMove = rotatedTeam2.pop();
          rotatedTeam2.unshift(playerToMove);
          newState.team2Rotation = rotatedTeam2;
          // newState.team2CurrentServePosition se actualizará automáticamente con la primera posición
        }
        // Actualizar la posición de saque actual después de la rotación
        newState.team1CurrentServePosition = newState.team1Rotation[0];
        newState.team2CurrentServePosition = newState.team2Rotation[0];
      }

      // Lógica para determinar el fin de set/partido
      const setsBeforeTieBreak = (state.setsToWin * 2) - 2;
      const isTieBreak = newState.setsTeam1 + newState.setsTeam2 === setsBeforeTieBreak;
      const pointsToWin = isTieBreak ? 15 : 25;
      const winByTwo = Math.abs(newState.scoreTeam1 - newState.scoreTeam2) >= 2;

      let setWon = false;
      let winningTeam = null;

      if (newState.scoreTeam1 >= pointsToWin && winByTwo && newState.scoreTeam1 > newState.scoreTeam2) {
        setWon = true;
        winningTeam = 1;
      } else if (newState.scoreTeam2 >= pointsToWin && winByTwo && newState.scoreTeam2 > newState.scoreTeam1) {
        setWon = true;
        winningTeam = 2;
      }

      if (setWon) {
        const currentSetScore = { team1: newState.scoreTeam1, team2: newState.scoreTeam2 };
        const newSetsTeam1 = winningTeam === 1 ? newState.setsTeam1 + 1 : newState.setsTeam1;
        const newSetsTeam2 = winningTeam === 2 ? newState.setsTeam2 + 1 : newState.setsTeam2;

        // Actualizar el historial de sets y los sets ganados
        newState = {
          ...newState,
          setScoresHistory: [...newState.setScoresHistory, currentSetScore],
          setsTeam1: newSetsTeam1,
          setsTeam2: newSetsTeam2,
          // Resetear los timeouts para el nuevo set
          timeoutsTeam1: initialState.timeoutsTeam1,
          timeoutsTeam2: initialState.timeoutsTeam2,
          // Al final de cada set, se podría resetear la rotación a la inicial o mantenerla si así se desea
          // Para este ejemplo, la reseteamos al orden inicial para el siguiente set
          scoreTeam1: 0, // Resetear puntos al final del set
          scoreTeam2: 0,
          team1Rotation: initialState.team1Rotation, // Resetear rotación al final del set
          team2Rotation: initialState.team2Rotation,
          team1CurrentServePosition: initialState.team1CurrentServePosition,
          team2CurrentServePosition: initialState.team2CurrentServePosition,
        };

        // Si se gana el partido (no solo un set), no resetear los puntos inmediatamente
        if (newSetsTeam1 === state.setsToWin || newSetsTeam2 === state.setsToWin) {
          // El partido terminó, los puntos se mantienen para la pantalla final
        } else {
          // No es fin de partido, resetear puntos para el nuevo set
          newState = {
            ...newState,
            scoreTeam1: 0,
            scoreTeam2: 0,
          };
        }
      }
      return newState;
    }
    case ActionTypes.REMOVE_POINT:
      // Si se remueve un punto y eso implica un cambio de saque, la rotación debería revertirse.
      // Esto es más complejo y podría requerir guardar el estado de rotación anterior
      // o simplemente no revertir la rotación al quitar puntos para simplificar.
      // Por ahora, solo se decrementa el punto sin afectar la rotación para evitar complejidad.
      return {
        ...state,
        scoreTeam1: action.payload.team === 1 ? Math.max(0, state.scoreTeam1 - 1) : state.scoreTeam1,
        scoreTeam2: action.payload.team === 2 ? Math.max(0, state.scoreTeam2 - 1) : state.scoreTeam2,
      };
    case ActionTypes.SWAP_SIDES:
      return {
        ...state,
        scoreTeam1: state.scoreTeam2,
        scoreTeam2: state.scoreTeam1,
        setsTeam1: state.setsTeam2,
        setsTeam2: state.setsTeam1,
        team1Name: state.team2Name,
        team2Name: state.team1Name,
        timeoutsTeam1: state.timeoutsTeam2,
        timeoutsTeam2: state.timeoutsTeam1,
        servingTeam: state.servingTeam === 1 ? 2 : 1,
        // Al cambiar de lado, las rotaciones también se "intercambian" visualmente
        team1Rotation: state.team2Rotation,
        team2Rotation: state.team1Rotation,
        team1CurrentServePosition: state.team2CurrentServePosition,
        team2CurrentServePosition: state.team1CurrentServePosition,
      };
    case ActionTypes.RESET_SCORES: // Este ya no es el principal para fin de set, pero puede ser útil si se usa explícitamente
      return {
        ...state,
        scoreTeam1: 0,
        scoreTeam2: 0,
        timeoutsTeam1: initialState.timeoutsTeam1,
        timeoutsTeam2: initialState.timeoutsTeam2,
        // También se puede resetear la rotación aquí si es necesario
        team1Rotation: initialState.team1Rotation,
        team2Rotation: initialState.team2Rotation,
        team1CurrentServePosition: initialState.team1CurrentServePosition,
        team2CurrentServePosition: initialState.team2CurrentServePosition,
      };
    case ActionTypes.SET_TEAM_NAME:
      return action.payload.team === 1
        ? { ...state, team1Name: action.payload.name }
        : { ...state, team2Name: action.payload.name };
    case ActionTypes.RESET_MATCH:
      return {
        ...initialState, // Vuelve al estado inicial completo
        setsToWin: action.payload.numSetsToWin !== undefined ? action.payload.numSetsToWin : state.setsToWin,
        // Asegurarse de que los nombres de equipo se mantengan si se reinicia sin cambiar el formato
        team1Name: action.payload.keepNames ? state.team1Name : initialState.team1Name,
        team2Name: action.payload.keepNames ? state.team2Name : initialState.team2Name,
      };
    case ActionTypes.SET_SETTINGS_MODAL_VISIBLE:
      return { ...state, isSettingsModalVisible: action.payload.visible };
    case ActionTypes.SET_SETS_TO_WIN:
      return { ...state, setsToWin: action.payload.numSets };
    case ActionTypes.DECREMENT_TIMEOUT:
      return action.payload.team === 1
        ? { ...state, timeoutsTeam1: Math.max(0, state.timeoutsTeam1 - 1) }
        : { ...state, timeoutsTeam2: Math.max(0, state.timeoutsTeam2 - 1) };
    case ActionTypes.LOAD_STATE:
      return {
        ...state, // Mantiene los valores iniciales por defecto que no están en savedState
        ...action.payload.savedState,
        setsToWin: action.payload.savedFormat?.setsToWin || state.setsToWin, // El cronómetro siempre inicia pausado
        // Asegurar que las nuevas propiedades de rotación se carguen o se inicien si no existen
        team1Rotation: action.payload.savedState.team1Rotation || initialState.team1Rotation,
        team2Rotation: action.payload.savedState.team2Rotation || initialState.team2Rotation,
        team1CurrentServePosition: action.payload.savedState.team1CurrentServePosition || initialState.team1CurrentServePosition,
        team2CurrentServePosition: action.payload.savedState.team2CurrentServePosition || initialState.team2CurrentServePosition,
        team1Color: action.payload.savedState.team1Color || initialState.team1Color, // Add this
        team2Color: action.payload.savedState.team2Color || initialState.team2Color, // Add this
      };
    case ActionTypes.SET_TEAM_ROTATION: // Nueva acción para permitir establecer la rotación inicial
      return action.payload.team === 1
        ? { ...state, team1Rotation: action.payload.rotation, team1CurrentServePosition: action.payload.rotation[0] }
        : { ...state, team2Rotation: action.payload.rotation, team2CurrentServePosition: action.payload.rotation[0] };
        // Cambio de color de los equipos
    case ActionTypes.SET_TEAM_COLOR:
      return action.payload.team === 1
        ? { ...state, team1Color: action.payload.color }
        : { ...state, team2Color: action.payload.color };
    default:
      return state;
  }
}

const VolleyballScoreApp = ({ navigation }) => {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);
  const { time, isActive, toggleTimer, resetTimer, setTime, formatTime, startTimer, pauseTimer } = useTimer(0);

  // Estado para el modal y la cuenta atrás del tiempo muerto
  const [timeoutTeamInfo, setTimeoutTeamInfo] = useState({ name: '', remaining: 0 });

  // Hook para manejar el sonido de fin de tiempo muerto
  const { playSound } = useSound(require('./../../assets/sounds/alerta.mp3'));

  // Cuando el tiempo muerto termina, pausamos el cronómetro principal y mostramos la alerta.
  const handleTimeoutFinish = useCallback(() => {
    playSound();
    if (isActive) {
      pauseTimer();
    }
    Alert.alert("Tiempo Fuera Terminado", `El tiempo fuera para ${timeoutTeamInfo.name} ha finalizado.`);
  }, [timeoutTeamInfo.name, isActive, pauseTimer, playSound]);

  // Usamos el nuevo callback que pausa el cronómetro principal
  const { countdown: timeoutCountdown, isActive: isTimeoutModalVisible, startCountdown, stopCountdown } = useCountdown(handleTimeoutFinish);

  const {
    scoreTeam1,
    scoreTeam2,
    setsTeam1,
    setsTeam2,
    team1Name,
    team2Name,
    setScoresHistory,
    servingTeam,
    timeoutsTeam1,
    timeoutsTeam2,
    setsToWin,
    isSettingsModalVisible,
    team1Rotation, // Nueva propiedad
    team2Rotation, // Nueva propiedad
    team1CurrentServePosition, // Nueva propiedad
    team2CurrentServePosition, // Nueva propiedad
    team1Color, // New
    team2Color, // New
  } = gameState;

  // Función para obtener un color de texto que contraste con el fondo
  const getContrastColor = (hexColor) => {
    if (!hexColor || hexColor.length < 7) return '#000000';
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#ffffff';
  };

  // Función para añadir un punto
  const addPoint = useCallback((team) => {
    dispatch({ type: ActionTypes.ADD_POINT, payload: { team } });
  }, []);

  // Función para restar un punto
  const removePoint = useCallback((team) => {
    dispatch({ type: ActionTypes.REMOVE_POINT, payload: { team } });
  }, []);

  // Intercambia los puntajes y sets de ambos equipos
  const swapSides = useCallback(() => {
    dispatch({ type: ActionTypes.SWAP_SIDES });
  }, []);

  const handleResetTimer = useCallback(() => {
    Alert.alert("Reiniciar Cronómetro", "¿Estás seguro de que quieres reiniciar el cronómetro?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sí, Reiniciar", onPress: resetTimer, style: "destructive" },
    ]);
  }, [resetTimer]);

  // Resetea todo el partido (puntos y sets)
  const resetMatch = useCallback(async (numSetsToWin = setsToWin, keepNames = false) => {
    dispatch({ type: ActionTypes.RESET_MATCH, payload: { numSetsToWin, keepNames } });
    resetTimer();
    try {
      // Limpia el estado guardado al reiniciar el partido
      await AsyncStorage.removeItem('gameState');
      await AsyncStorage.setItem('matchFormat', JSON.stringify({ setsToWin: numSetsToWin }));
    } catch (error) {
      console.error('Failed to clear the async storage.', error);
    }
  }, [setsToWin, resetTimer]);

  // Muestra una alerta de confirmación antes de reiniciar el partido
  const handleResetMatch = useCallback(() => {
    Alert.alert(
      "Reiniciar Partido", "Se borrarán los puntos, sets, nombres (a menos que canceles y solo cambies formato) y el cronómetro. ¿Continuar?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        { text: "Sí, Reiniciar", onPress: () => resetMatch(setsToWin, false), style: "destructive" },
      ]
    );
  }, [resetMatch, setsToWin]);

  // Funciones para el modal de ajustes
  const handleOpenSettings = useCallback(() => {
    dispatch({ type: ActionTypes.SET_SETTINGS_MODAL_VISIBLE, payload: { visible: true } });
  }, []);

  const handleFormatChange = useCallback(async (numSets) => {
    dispatch({ type: ActionTypes.SET_SETTINGS_MODAL_VISIBLE, payload: { visible: false } });
    // Si el partido ya ha comenzado, pide confirmación para reiniciar.
    if (setsTeam1 > 0 || setsTeam2 > 0 || scoreTeam1 > 0 || scoreTeam2 > 0) {
      Alert.alert(
        "Confirmar cambio",
        "Cambiar el formato del partido reiniciará el marcador actual. ¿Deseas continuar?",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Sí, reiniciar", onPress: () => resetMatch(numSets, true) }, // Mantener nombres al cambiar solo formato
        ]
      );
    } else {
      // Si el partido no ha comenzado, simplemente cambia el formato.
      dispatch({ type: ActionTypes.SET_SETS_TO_WIN, payload: { numSets } });
      try {
        await AsyncStorage.setItem('matchFormat', JSON.stringify({ setsToWin: numSets }));
      } catch (e) {
        console.error("Failed to save match format", e);
      }
    }
  }, [setsTeam1, setsTeam2, scoreTeam1, scoreTeam2, resetMatch]);

  const handleTimeout = useCallback((team) => {
    const remainingTimeouts = team === 1 ? gameState.timeoutsTeam1 : gameState.timeoutsTeam2;
    const teamName = team === 1 ? gameState.team1Name : gameState.team2Name;

    if (remainingTimeouts > 0) {
      // Si el cronómetro principal no está corriendo, lo iniciamos.
      if (!isActive) {
        startTimer();
      }
      dispatch({ type: ActionTypes.DECREMENT_TIMEOUT, payload: { team } });
      setTimeoutTeamInfo({ name: teamName, remaining: remainingTimeouts - 1 });
      startCountdown(30);
    } else {
      Alert.alert("No hay tiempos fuera", "No quedan tiempos fuera disponibles para este equipo en este set.");
    }
  }, [gameState.timeoutsTeam1, gameState.timeoutsTeam2, gameState.team1Name, gameState.team2Name, startCountdown, isActive, startTimer]);

  // Guarda el resultado del partido en el historial
  const saveMatchToHistory = useCallback(async (winnerName, finalSets1, finalSets2, finalSetScores) => {
    const matchResult = {
      id: Date.now(),
      team1Name,
      team2Name,
      setsTeam1: finalSets1,
      setsTeam2: finalSets2,
      setScores: finalSetScores,
      winner: winnerName,
      date: new Date().toISOString(),
    };

    try {
      const existingHistoryJSON = await AsyncStorage.getItem('matchHistory');
      const history = existingHistoryJSON ? JSON.parse(existingHistoryJSON) : [];

      const updatedHistory = [matchResult, ...history];

      await AsyncStorage.setItem('matchHistory', JSON.stringify(updatedHistory));

      Alert.alert(
        "¡Partido Terminado!",
        `${winnerName} ha ganado el partido. El resultado se guardó en el historial.`,
        [{ text: "OK", onPress: () => resetMatch(setsToWin, true) }] // Mantener el formato y nombres al resetear
      );
    } catch (error) {
      console.error('Failed to save match to history', error);
      Alert.alert("Error", "No se pudo guardar el partido en el historial.");
    }
  }, [team1Name, team2Name, resetMatch, setsToWin]);

  // useEffect para CARGAR el estado del partido al iniciar la app
  useEffect(() => {
    const loadState = async () => {
      try {
        const savedStateJSON = await AsyncStorage.getItem('gameState');
        const savedFormatJSON = await AsyncStorage.getItem('matchFormat');
        let savedState = {};
        let savedFormat = {};

        if (savedFormatJSON !== null) {
          savedFormat = JSON.parse(savedFormatJSON);
        }
        if (savedStateJSON !== null) {
          savedState = JSON.parse(savedStateJSON);
        }
        dispatch({ type: ActionTypes.LOAD_STATE, payload: { savedState, savedFormat } });
        if (savedState.time) {
          setTime(savedState.time);
        }
      } catch (error) {
        console.error('Failed to load state from async storage', error);
      }
    };

    loadState();
  }, [setTime]); // El array vacío asegura que esto se ejecute solo una vez al montar

  // Efecto para GUARDAR el estado del partido cada vez que cambia (excepto cronómetro y modal)
  useEffect(() => {
    const saveState = async () => {
      try {
        const gameState = {
          scoreTeam1,
          scoreTeam2,
          setsTeam1,
          setsTeam2,
          team1Name,
          team2Name,
          time, // Guardamos el tiempo, aunque al cargar se reinicie el crono
          setScoresHistory,
          servingTeam,
          timeoutsTeam1,
          timeoutsTeam2,
          team1Rotation, // Guardar rotación
          team2Rotation, // Guardar rotación
          team1CurrentServePosition, // Guardar posición de saque
          team2CurrentServePosition, // Guardar posición de saque
          team1Color, // New
          team2Color, // New
        };
        const gameStateJSON = JSON.stringify(gameState);
        await AsyncStorage.setItem('gameState', gameStateJSON);
      } catch (error) {
        console.error('Failed to save state to async storage', error);
      }
    };
    saveState();
  }, [scoreTeam1, scoreTeam2, setsTeam1, setsTeam2, team1Name, team2Name, time, setScoresHistory, servingTeam, timeoutsTeam1, timeoutsTeam2, team1Rotation, team2Rotation, team1CurrentServePosition, team2CurrentServePosition, team1Color, team2Color]);

  // Nuevo useEffect para manejar las ALERTS de fin de set y fin de partido
  useEffect(() => {
    const totalSetHistory = setScoresHistory.length;

    // Comprobar si un set ha terminado (solo si setsTeam1 o setsTeam2 acaban de alcanzar un nuevo valor y no es el fin del partido)
    if (totalSetHistory > 0 && setsTeam1 < setsToWin && setsTeam2 < setsToWin) {
      const lastSetScore = setScoresHistory[totalSetHistory - 1];
      // Para evitar que se dispare al cargar el estado inicial si ya hay historial
      if (lastSetScore && (lastSetScore.team1 !== 0 || lastSetScore.team2 !== 0)) {
        const winnerName = lastSetScore.team1 > lastSetScore.team2 ? team1Name : team2Name;
        Alert.alert(
          `¡Set para ${winnerName}!`,
          `Puntaje del set: ${lastSetScore.team1} - ${lastSetScore.team2}.\nMarcador de sets: ${setsTeam1} a ${setsTeam2}.`,
          [{ text: 'OK' }]
        );
      }
    }

    // Comprobar si el partido ha terminado
    if (setsTeam1 === setsToWin) {
      const winnerName = team1Name;
      saveMatchToHistory(winnerName, setsTeam1, setsTeam2, setScoresHistory);
    } else if (setsTeam2 === setsToWin) {
      const winnerName = team2Name;
      saveMatchToHistory(winnerName, setsTeam1, setsTeam2, setScoresHistory);
    }

  }, [setsTeam1, setsTeam2, setsToWin, team1Name, team2Name, setScoresHistory, saveMatchToHistory]);

  // Función para renderizar el círculo del jugador y resaltar al sacador
  const renderPlayerCircle = (playerNumber, team, currentServePosition) => {
    const isServingPlayer = (team === 1 && playerNumber === team1CurrentServePosition && servingTeam === 1) ||
                            (team === 2 && playerNumber === team2CurrentServePosition && servingTeam === 2);

    return (
      <View style={[styles.playerCircle, isServingPlayer && styles.servingPlayerCircle]}>
        <Text style={styles.playerNumber}>{playerNumber}</Text>
        {isServingPlayer && <FontAwesome5 name="volleyball-ball" size={18} color="black" style={styles.serveBallIcon} />}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="" />
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.timerContainer}
          onPress={toggleTimer}
          onLongPress={handleResetTimer}
        >
          <Text style={styles.timerText}>{formatTime(time)}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.scoreSection}>
        <View style={styles.teamScoreColumn}>
          <View style={styles.teamHeader}>
            {servingTeam === 1 && <FontAwesome5 name="volleyball-ball" size={24} color="green" style={styles.servingIcon} />}
            <TextInput
              style={[styles.teamName, {color: team1Color}]}
              value={team1Name}
              onChangeText={(name) => dispatch({ type: 'SET_TEAM_NAME', payload: { team: 1, name } })}
              maxLength={15}
            />
          </View>
          <Text style={[styles.setsText, {color: team1Color}]}>SETS: {setsTeam1}</Text>
          <TouchableOpacity
            style={[styles.scoreBox, {borderColor: team1Color}]}
            onPress={() => addPoint(1)}
            onLongPress={() => removePoint(1)}
          >
            <Text style={[styles.scoreText, {color: team1Color}]}>{scoreTeam1.toString().padStart(2, '0')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.timeoutButton} onPress={() => handleTimeout(1)}>
            <Text style={styles.timeoutText}>T.O. ({timeoutsTeam1})</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.verticalDivider} />

        <View style={styles.teamScoreColumn}>
          <View style={styles.teamHeader}>
            <TextInput
              style={[styles.teamName, {color: team2Color}]}
              value={team2Name}
              onChangeText={(name) => dispatch({ type: 'SET_TEAM_NAME', payload: { team: 2, name } })}
              maxLength={15}
            />
            {servingTeam === 2 && <FontAwesome5 name="volleyball-ball" size={24} color="green" style={styles.servingIcon} />}
          </View>
          <Text style={[styles.setsText, {color: team2Color}]}>SETS: {setsTeam2}</Text>
          <TouchableOpacity
            style={[styles.scoreBox, {borderColor: team2Color}]}
            onPress={() => addPoint(2)}
            onLongPress={() => removePoint(2)}
          >
            <Text style={[styles.scoreText, {color: team2Color}]}>{scoreTeam2.toString().padStart(2, '0')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.timeoutButton} onPress={() => handleTimeout(2)}>
            <Text style={styles.timeoutText}>T.O. ({timeoutsTeam2})</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.controlsSection}>
        <TouchableOpacity style={styles.controlButton} onPress={swapSides}>
          <Ionicons name="swap-horizontal-outline" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => navigation.navigate('Equipos')} // Cambiado a 'Equipos' para la pestaña
        >
          <Ionicons name="people-outline" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={handleOpenSettings}>
          <Ionicons name="settings-outline" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlButton, styles.resetButton]} onPress={handleResetMatch}>
          <Ionicons name="refresh-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.rotationSection}>
        <View style={styles.teamRotationColumn}>
          <Text style={styles.rotationTitle}>Rotación {team1Name}</Text>
          <View style={styles.rotationGrid}>

            <View style={styles.rotationRow}>
              {renderPlayerCircle(team1Rotation[3], 1, team1CurrentServePosition)}
              {renderPlayerCircle(team1Rotation[2], 1, team1CurrentServePosition)}
              {renderPlayerCircle(team1Rotation[1], 1, team1CurrentServePosition)}
            </View>

            <View style={styles.rotationRow}>
              {renderPlayerCircle(team1Rotation[4], 1, team1CurrentServePosition)}
              {renderPlayerCircle(team1Rotation[5], 1, team1CurrentServePosition)}
              {renderPlayerCircle(team1Rotation[0], 1, team1CurrentServePosition)}
            </View>
          </View>
        </View>

        <View style={styles.verticalDivider} />

        <View style={styles.teamRotationColumn}>
          <Text style={styles.rotationTitle}>Rotación {team2Name}</Text>
          <View style={styles.rotationGrid}>

            <View style={styles.rotationRow}>
              {renderPlayerCircle(team2Rotation[3], 2, team2CurrentServePosition)}
              {renderPlayerCircle(team2Rotation[2], 2, team2CurrentServePosition)}
              {renderPlayerCircle(team2Rotation[1], 2, team2CurrentServePosition)}
            </View>

            <View style={styles.rotationRow}>
              {renderPlayerCircle(team2Rotation[4], 2, team2CurrentServePosition)}
              {renderPlayerCircle(team2Rotation[5], 2, team2CurrentServePosition)}
              {renderPlayerCircle(team2Rotation[0], 2, team2CurrentServePosition)}
            </View>
          </View>
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={isSettingsModalVisible}
        onRequestClose={() => dispatch({ type: 'SET_SETTINGS_MODAL_VISIBLE', payload: { visible: false } })}
      >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Configuración del Partido</Text>

          <Text style={styles.modalSubtitle}>Formato del Partido</Text>
          <TouchableOpacity
            style={[styles.modalButton, setsToWin === 2 && styles.modalButtonActive]}
            onPress={() => handleFormatChange(2)}
          >
          <Text style={[styles.modalButtonText, setsToWin === 2 && styles.modalButtonTextActive]}>
            Al mejor de 3 (Gana 2)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modalButton, setsToWin === 3 && styles.modalButtonActive]}
          onPress={() => handleFormatChange(3)}
        >
          <Text style={[styles.modalButtonText, setsToWin === 3 && styles.modalButtonTextActive]}>
            Al mejor de 5 (Gana 3)
          </Text>
        </TouchableOpacity>

          <Text style={styles.modalSubtitle}>Color {team1Name}</Text>
          <View style={styles.colorPickerContainer}>
            {['#007bff', '#28a745', '#dc3545', '#ffc107', '#6f42c1', '#17a2b8', '#fd7e14'].map(color => (
        <TouchableOpacity
          key={color}
          style={[styles.colorOption, { backgroundColor: color, borderWidth: team1Color === color ? 3 : 1 }]}
          onPress={() => dispatch({ type: ActionTypes.SET_TEAM_COLOR, payload: { team: 1, color } })}
        />
        ))}
      </View>

          <Text style={styles.modalSubtitle}>Color {team2Name}</Text>
      <View style={styles.colorPickerContainer}>
          {['#007bff', '#28a745', '#dc3545', '#ffc107', '#6f42c1', '#17a2b8', '#fd7e14'].map(color => (
        <TouchableOpacity
            key={color}
            style={[styles.colorOption, { backgroundColor: color, borderWidth: team2Color === color ? 3 : 1 }]}
            onPress={() => dispatch({ type: ActionTypes.SET_TEAM_COLOR, payload: { team: 2, color } })}
        />
          ))}
      </View>

        <TouchableOpacity style={[styles.modalButton, styles.modalCancelButton]} onPress={() => dispatch({ type: 'SET_SETTINGS_MODAL_VISIBLE', payload: { visible: false } })}>
          <Text style={[styles.modalButtonText, { color: 'white' }]}>Cerrar</Text>
        </TouchableOpacity>
        </View>
      </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={isTimeoutModalVisible}
        onRequestClose={stopCountdown}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Tiempo Fuera</Text>
            <Text style={styles.timeoutTeamName}>{timeoutTeamInfo.name}</Text>
            <Text style={styles.timeoutCountdownText}>{timeoutCountdown}</Text>
            <Text style={styles.timeoutInfoText}>Tiempos restantes: {timeoutTeamInfo.remaining}</Text>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton]}
              onPress={stopCountdown}
            >
              <Text style={[styles.modalButtonText, { color: 'white' }]}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  topBar: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
  },
  timerContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#555',
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  scoreSection: {
    flexDirection: 'row',
    flex: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  teamScoreColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  servingIcon: {
    marginHorizontal: 8,
  },
  teamName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    paddingHorizontal: 10,
    minWidth: 150,
  },
  setsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
  },
  scoreBox: {
    borderWidth: 2,
    borderColor: '#555',
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderRadius: 5,
    backgroundColor: 'white',
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#333',
  },
  timeoutButton: {
    marginTop: 15,
    backgroundColor: '#6c757d',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  timeoutText: {
    color: 'white',
    fontWeight: 'bold',
  },
  verticalDivider: {
    width: 1,
    backgroundColor: '#ccc',
  },
  controlsSection: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f8f9fa',
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  resetButton: {
    backgroundColor: '#dc3545',
  },
  rotationSection: {
    flexDirection: 'row',
    flex: 2,
    paddingTop: 10,
  },
  teamRotationColumn: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 20,
  },
  rotationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  rotationGrid: {
    width: '90%', // Ajusta el ancho para acomodar 3 columnas
    alignItems: 'center',
  },
  rotationRow: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Distribuye los círculos uniformemente
    width: '100%',
    marginBottom: 15,
  },
  playerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ADD8E6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#666',
    position: 'relative',
    marginHorizontal: 5, // Añade un poco de espacio horizontal entre los círculos
  },
  playerNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  servingPlayerCircle: {
    backgroundColor: '#4CAF50',
    borderColor: '#2E8B57',
  },
  serveBallIcon: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 15,
    elevation: 2,
    marginBottom: 10,
    width: '100%',
  },
  modalButtonActive: {
    backgroundColor: '#007bff',
  },
  modalCancelButton: {
    marginTop: 10,
    backgroundColor: '#6c757d',
  },
  modalButtonText: {
    color: 'black',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalButtonTextActive: {
    color: 'white',
  },
  timeoutTeamName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  timeoutCountdownText: {
    fontSize: 80,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 15,
    // Evita que el ancho del texto cambie al contar
    fontVariant: ['tabular-nums'],
  },
  timeoutInfoText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
    width: '100%',
  },
  colorPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 15,
    width: '100%',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 5,
    borderColor: '#ccc', // Default border for unselected
    borderWidth: 1,
  },
  colorOptionSelected: { // Estilo para la opción de color seleccionada
    borderColor: '#333', // Borde más oscuro para indicar selección
  },
});

export default VolleyballScoreApp;