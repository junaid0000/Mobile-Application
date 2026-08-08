import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Production server domain with SSL (HTTPS) for store builds
// Replace PROD_BACKEND_URL with your live server domain when deployed
const PROD_BACKEND_URL = 'https://rossomandi-backend.onrender.com';

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

// Use local server for local machine testing, or live Render server in production
export const BASE_URL = __DEV__ 
  ? `http://${host}:5000`
  : PROD_BACKEND_URL;

// Configure default axios headers
axios.defaults.headers.common['bypass-tunnel-reminder'] = 'true';
axios.defaults.headers.common['Bypass-Tunnel-Reminder'] = 'true';
axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true';







