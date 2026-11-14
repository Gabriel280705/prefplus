import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Os valores vêm do arquivo .env (veja .env.example). No Expo, variáveis
// que começam com EXPO_PUBLIC_ são lidas automaticamente.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigurado = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

let authInstance = null;
let dbInstance = null;
let erroInicializacao = null;

// Só inicia o Firebase se as chaves existirem. Qualquer falha é guardada em
// "firebaseErro" para o App mostrar na tela (em vez de fechar com "Something went wrong").
if (firebaseConfigurado) {
  try {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

    if (Platform.OS === 'web') {
      authInstance = getAuth(app); // no navegador o login já fica salvo sozinho
    } else {
      // Celular: mantém o login salvo no aparelho. O adaptador chama o AsyncStorage
      // "na hora", como recomenda a documentação do Expo.
      try {
        authInstance = initializeAuth(app, {
          persistence: getReactNativePersistence({
            getItem: (...a) => AsyncStorage.getItem(...a),
            setItem: (...a) => AsyncStorage.setItem(...a),
            removeItem: (...a) => AsyncStorage.removeItem(...a),
          }),
        });
      } catch {
        authInstance = getAuth(app); // já inicializado (Fast Refresh)
      }
    }
    dbInstance = getFirestore(app);
  } catch (e) {
    erroInicializacao = e;
    authInstance = null;
    dbInstance = null;
  }
}

export const firebaseErro = erroInicializacao ? String((erroInicializacao && erroInicializacao.message) || erroInicializacao) : null;
export const firebasePronto = firebaseConfigurado && !erroInicializacao;
export const auth = authInstance;
export const db = dbInstance;
