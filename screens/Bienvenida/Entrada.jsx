import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Image, Pressable, StatusBar, FlatList, Dimensions, Linking, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Hook para manejar el tema usando la paleta estandarizada
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
    slideBackground: isDarkMode ? '#11161cff' : '#11161cff', // Mantener fondo oscuro para bienvenida
    cardBackground: isDarkMode ? '#1a212aff' : 'rgba(255,255,255,0.06)',
    
    // Textos
    text: isDarkMode ? '#ffffff' : '#ffffff', // Texto siempre blanco para contraste
    textSecondary: isDarkMode ? '#b6c8d8' : '#b6c8d8',
    textTertiary: isDarkMode ? '#8a9ba8' : '#8a9ba8',
    subtitle: isDarkMode ? '#9cc9ff' : '#9cc9ff',
    paragraph: isDarkMode ? '#d9e6f2' : '#d9e6f2',
    feature: isDarkMode ? '#e3f1ff' : '#e3f1ff',
    footer: isDarkMode ? '#6d859a' : '#6d859a',
    
    // Botones y acciones
    buttonPrimary: isDarkMode ? '#4a9eff' : '#007bff',
    buttonPrimaryPressed: isDarkMode ? '#3182ce' : '#0062cc',
    buttonSecondary: 'rgba(255,255,255,0.10)',
    buttonSecondaryPressed: 'rgba(255,255,255,0.18)',
    buttonSkip: 'rgba(255,255,255,0.08)',
    
    // Elementos específicos
    bullet: isDarkMode ? '#4a9eff' : '#2fa8ff',
    dotInactive: 'rgba(255,255,255,0.18)',
    dotActive: isDarkMode ? '#4a9eff' : '#2fa8ff',
    link: isDarkMode ? '#4a9eff' : '#2fa8ff',
  };

  return { isDarkMode, colors };
};

// Pantalla de bienvenida que se muestra solo el primer inicio.
// Recibe onFinish (función) para notificar al contenedor que debe continuar a la app principal.
export default function Entrada({ onFinish }) {
  const { isDarkMode, colors } = useTheme();
  
  // Crear estilos dinámicos basados en el tema
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [saving, setSaving] = useState(false);
  const [index, setIndex] = useState(0);
  const flatRef = useRef(null);
  const width = Dimensions.get('window').width;

  const slides = [
    {
      key: 'intro',
      title: 'Marcador Vóley',
      subtitle: 'Bienvenido/a',
      text: 'Lleva el control de puntos, sets, tiempos muertos y rotaciones de manera simple y rápida.',
      features: [
        'Marcador en tiempo real',
        'Gestión de sets y rotaciones',
        'Tiempos muertos con sonido',
        'Historial de partidos',
        'Colores y nombres personalizables',
      ],
    },
    {
      key: 'puntos',
      title: 'Puntos & Sets',
      text: 'Suma/resta puntos con un toque y lleva automáticamente el conteo de sets ganados.',
      foto: require('../../assets/points-and-sets.png'),
      image: require('../../assets/voley-icon.png'),
    },
    {
      key: 'tiempos',
      title: 'Tiempos Muertos',
      text: 'Activa un tiempo muerto con cuenta regresiva y alerta sonora al finalizar.',
      foto: require('../../assets/time-out.png'),
      image: require('../../assets/voley-icon.png'),
    },
    {
      key: 'historial',
      title: 'Historial',
      text: 'Consulta partidos anteriores: puntuaciones, sets y duración.',
      foto: require('../../assets/historial.png'),
      image: require('../../assets/voley-icon.png'),
    },
    {
      key: 'personaliza',
      title: 'Personalización',
      text: 'Define nombres de equipos, colores y rotaciones iniciales para cada set.',
      foto: require('../../assets/personalizar.png'),
      image: require('../../assets/voley-icon.png'),
    },
  ];

  const last = slides.length - 1;

  const finishOnboarding = useCallback(async () => {
    await AsyncStorage.removeItem('hasSeenWelcome');
    if (saving) return;
    setSaving(true);
    try {
      await AsyncStorage.setItem('hasSeenWelcome', 'true');
    } catch (e) {
      console.warn('No se pudo guardar hasSeenWelcome', e);
    } finally {
      onFinish?.();
    }
  }, [onFinish, saving]);

  const goNext = useCallback(() => {
    if (index === last) return finishOnboarding();
    const next = index + 1;
    setIndex(next);
    flatRef.current?.scrollToIndex({ index: next, animated: true });
  }, [index, last, finishOnboarding]);

  const goPrev = useCallback(() => {
    if (index === 0) return;
    const prev = index - 1;
    setIndex(prev);
    flatRef.current?.scrollToIndex({ index: prev, animated: true });
  }, [index]);

  const skipAll = useCallback(() => finishOnboarding(), [finishOnboarding]);

  const onMomentumEnd = useCallback((e) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    if (newIndex !== index) setIndex(newIndex);
  }, [width, index]);

  const renderItem = ({ item }) => (
    <View style={[styles.slide, { width }]}>      
      <Image source={item.image || require('../../assets/voley-icon.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>{item.title}</Text>
      {item.subtitle && <Text style={styles.subtitle}>{item.subtitle}</Text>}
      <Text style={styles.paragraph}>{item.text}</Text>
      {item.foto && (
        <Image source={item.foto} style={styles.foto} resizeMode="contain" />
      )}
      {item.features && (
        <View style={styles.featuresBox}>
          {item.features.map(f => <Feature key={f} text={f} styles={styles} />)}
          {item.foto && (
            <Image source={item.foto} style={styles.foto} resizeMode="contain" />
          )}
        </View>
      )}
    </View>
  );

  return (
  <View style={styles.container}>
      <StatusBar style={isDarkMode ? 'light' : 'light'} />
      <FlatList
        ref={flatRef}
        data={slides}
        keyExtractor={(s) => s.key}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        bounces={false}
        initialNumToRender={1}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
  style={styles.flatList}
      />

      <View style={styles.pagination}>        
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

  <View style={styles.actionsRow}>
        <Pressable
          disabled={index === 0}
          onPress={goPrev}
          style={({ pressed }) => [
            styles.backButton,
            index === 0 && styles.disabled,
            pressed && index !== 0 && styles.backButtonPressed,
          ]}
        >
          <Text style={styles.backButtonText}>Atrás</Text>
        </Pressable>

  <View style={styles.skipArea}>
          {index < last && (
            <Pressable
              onPress={skipAll}
              style={({ pressed }) => [styles.skipButton, pressed && styles.skipButtonPressed]}
            >
              <Text style={styles.skipText}>Saltar</Text>
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={goNext}
          style={({ pressed }) => [
            styles.nextButton,
            pressed && styles.nextButtonPressed,
          ]}
        >
          <Text style={styles.nextButtonText}>
            {index === last ? (saving ? 'Iniciando...' : 'Comenzar') : 'Siguiente'}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.footer}>
        ¿Mejoras? Escríbeme: <Text style={styles.link} onPress={() => Linking.openURL('mailto:devmatiaspallero@gmail.com?subject=Feedback App Voley')}>devmatiaspallero@gmail.com</Text>
      </Text>
    </View>
  );
}

const Feature = ({ text, styles }) => (
  <View style={styles.featureItem}>
    <View style={styles.bullet} />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

// Función para crear estilos dinámicos basados en el tema
const createStyles = (colors) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.slideBackground
  },
  flatList: { 
    flexGrow: 0 
  },
  logo: { 
    width: 140, 
    height: 140, 
    marginBottom: 8 
  },
  slide: { 
    flex: 1, 
    paddingHorizontal: 28, 
    paddingTop: 60, 
    paddingBottom: 40, 
    alignItems: 'center' 
  },
  title: { 
    fontSize: 32, 
    fontWeight: '700', 
    color: colors.text, 
    textAlign: 'center' 
  },
  subtitle: { 
    marginTop: 4, 
    fontSize: 18, 
    fontWeight: '500', 
    color: colors.subtitle 
  },
  paragraph: { 
    marginTop: 20, 
    fontSize: 16, 
    lineHeight: 20, 
    color: colors.paragraph, 
    textAlign: 'center' 
  },
  foto: {
    width: '100%',
    height: 140,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuresBox: { 
    width: '100%', 
    marginTop: 18, 
    backgroundColor: colors.cardBackground, 
    borderRadius: 18, 
    padding: 18, 
    gap: 10 
  },
  featureItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  bullet: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: colors.bullet, 
    marginRight: 10 
  },
  featureText: { 
    flex: 1, 
    fontSize: 15, 
    color: colors.feature 
  },
  nextButton: { 
    backgroundColor: colors.buttonPrimary, 
    paddingVertical: 12, 
    paddingHorizontal: 26, 
    borderRadius: 14, 
    shadowColor: colors.buttonPrimary, 
    shadowOpacity: 0.3, 
    shadowRadius: 5, 
    shadowOffset: { width: 0, height: 3 }, 
    elevation: 3 
  },
  nextButtonPressed: { 
    backgroundColor: colors.buttonPrimaryPressed, 
    transform: [{ scale: 0.95 }], 
    shadowOpacity: 0.15 
  },
  nextButtonText: { 
    color: colors.text, 
    fontSize: 16, 
    fontWeight: '600', 
    letterSpacing: 0.5 
  },
  actionsRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 22, 
    marginTop: 10 
  },
  backButton: { 
    backgroundColor: colors.buttonSecondary, 
    paddingVertical: 10, 
    paddingHorizontal: 18, 
    borderRadius: 10 
  },
  backButtonPressed: { 
    backgroundColor: colors.buttonSecondaryPressed, 
    transform: [{ scale: 0.94 }] 
  },
  backButtonText: { 
    color: colors.feature, 
    fontSize: 14, 
    fontWeight: '500' 
  },
  disabled: { 
    opacity: 0.35 
  },
  skipButton: { 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 8 
  },
  skipButtonPressed: { 
    backgroundColor: colors.buttonSkip 
  },
  skipArea: { 
    flex: 1, 
    alignItems: 'center' 
  },
  skipText: { 
    color: colors.textSecondary, 
    fontSize: 14, 
    fontWeight: '500' 
  },
  pagination: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 34, 
    gap: 8 
  },
  dot: { 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    backgroundColor: colors.dotInactive 
  },
  dotActive: { 
    backgroundColor: colors.dotActive, 
    width: 22 
  },
  footer: { 
    marginTop: 'auto', 
    paddingBottom: 36,
    fontSize: 12, 
    color: colors.footer, 
    textAlign: 'center', 
    lineHeight: 16 
  },
  link: { 
    color: colors.link 
  },
});
