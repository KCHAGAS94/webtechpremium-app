import AsyncStorage from '@react-native-async-storage/async-storage';

// Controle dos Pais — password gating "Ocultar Categorias" and "Limpar
// Históricos" in Configurações. No password set means those actions stay
// open to everyone, matching the current behavior.
const PASSWORD_KEY = 'webtech.parentalControl.password';

export async function loadParentalPassword(): Promise<string | null> {
  return AsyncStorage.getItem(PASSWORD_KEY);
}

export async function saveParentalPassword(password: string): Promise<void> {
  await AsyncStorage.setItem(PASSWORD_KEY, password);
}

export async function clearParentalPassword(): Promise<void> {
  await AsyncStorage.removeItem(PASSWORD_KEY);
}
