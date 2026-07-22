import { Platform } from 'react-native';

// Always use 192.168.12.152 for native (Android/iOS).
// For web browsers, detect the host automatically so it works
// from both localhost:8081 and 192.168.12.152:8081.
let host = '192.168.12.152';
if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
  host = window.location.hostname || '192.168.12.152';
}

export const BASE_URL = `http://${host}:5000`;
