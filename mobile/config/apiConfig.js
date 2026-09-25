import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Production server domain with SSL (HTTPS) for store builds
// Replace PROD_BACKEND_URL with your live server domain when deployed
const PROD_BACKEND_URL = 'https://rossomandi-backend.vercel.app';

let host = '192.168.12.152';

if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
  host = window.location.hostname || '192.168.12.152';
} else if (Constants.expoConfig?.hostUri) {
  // Automatically extract Metro host IP (e.g. 192.168.12.152 from 192.168.12.152:8081)
  host = Constants.expoConfig.hostUri.split(':')[0];
} else if (Constants.manifest2?.extra?.expoGo?.debuggerHost) {
  host = Constants.manifest2.extra.expoGo.debuggerHost.split(':')[0];
}

import axios from 'axios';

const isLocalWeb = typeof window !== 'undefined' && (
  window.location?.hostname === 'localhost' ||
  window.location?.hostname === '127.0.0.1' ||
  window.location?.hostname?.startsWith('192.168.') ||
  window.location?.hostname?.startsWith('10.') ||
  window.location?.hostname?.startsWith('172.')
);

const LOCAL_BACKEND_URL = Platform.OS === 'web'
  ? `http://${(typeof window !== 'undefined' && window.location?.hostname) || 'localhost'}:5000`
  : `http://${host}:5000`;

export const BASE_URL = (__DEV__ || isLocalWeb) ? LOCAL_BACKEND_URL : PROD_BACKEND_URL;

// Configure default axios headers
axios.defaults.headers.common['bypass-tunnel-reminder'] = 'true';
axios.defaults.headers.common['Bypass-Tunnel-Reminder'] = 'true';
axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true';







