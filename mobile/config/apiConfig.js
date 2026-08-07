import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Production server domain with SSL (HTTPS) for store builds
// Replace PROD_BACKEND_URL with your live server domain when deployed
const PROD_BACKEND_URL = 'https://api.rossomandi.com'; 

let host = '192.168.12.152';

if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
  host = window.location.hostname || '192.168.12.152';
} else if (Constants.expoConfig?.hostUri) {
  // Automatically extract Metro host IP (e.g. 192.168.12.152 from 192.168.12.152:8081)
  host = Constants.expoConfig.hostUri.split(':')[0];
} else if (Constants.manifest2?.extra?.expoGo?.debuggerHost) {
  host = Constants.manifest2.extra.expoGo.debuggerHost.split(':')[0];
}

// Automatically uses local IP during development (__DEV__ = true)
// and production server domain when building for App Store / Play Store
export const BASE_URL = __DEV__ 
  ? `http://${host}:5000` 
  : PROD_BACKEND_URL;


