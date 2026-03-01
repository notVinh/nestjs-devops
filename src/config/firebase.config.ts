import * as admin from 'firebase-admin';

export interface FirebaseCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}

export const getFirebaseCredentials = (): FirebaseCredentials => {
  // Get private key and handle different formats
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';

  // If private key contains literal \n, replace with actual newlines
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  return {
    type: process.env.FIREBASE_TYPE || 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID || '',
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
    private_key: privateKey,
    client_email: process.env.FIREBASE_CLIENT_EMAIL || '',
    client_id: process.env.FIREBASE_CLIENT_ID || '',
    auth_uri:
      process.env.FIREBASE_AUTH_URI ||
      'https://accounts.google.com/o/oauth2/auth',
    token_uri:
      process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url:
      process.env.FIREBASE_AUTH_PROVIDER_CERT_URL ||
      'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL || '',
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN || 'googleapis.com',
  };
};

export function configFirebase(params?: FirebaseCredentials): void {
  if (admin.apps.length > 0) {
    return;
  }

  const credentials = params || getFirebaseCredentials();

  // Validate required fields
  if (
    !credentials.project_id ||
    !credentials.private_key ||
    !credentials.client_email
  ) {
    console.warn(
      '[Firebase] Credentials not configured. Push notifications will be disabled.'
    );
    console.warn('[Firebase] Please check your .env file and configure Firebase credentials.');
    return;
  }

  // Validate private key format
  if (
    !credentials.private_key.includes('BEGIN PRIVATE KEY') ||
    !credentials.private_key.includes('END PRIVATE KEY')
  ) {
    console.error(
      '[Firebase] Invalid private key format. Must be a valid PEM format key.'
    );
    console.error('[Firebase] Example format:');
    console.error('[Firebase] -----BEGIN PRIVATE KEY-----');
    console.error('[Firebase] MIIEvgIBADANBgkq...');
    console.error('[Firebase] -----END PRIVATE KEY-----');
    return;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(credentials as admin.ServiceAccount),
    });

  } catch (error) {
    console.error('[Firebase] Failed to initialize:', error.message);
  }
}
