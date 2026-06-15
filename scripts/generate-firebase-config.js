const fs = require('fs');

const config = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'COLE_SUA_API_KEY_AQUI',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'COLE_SEU_AUTH_DOMAIN_AQUI',
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || 'COLE_SEU_DATABASE_URL_AQUI',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'COLE_SEU_PROJECT_ID_AQUI',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'COLE_SEU_STORAGE_BUCKET_AQUI',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'COLE_SEU_MESSAGING_SENDER_ID_AQUI',
  appId: process.env.VITE_FIREBASE_APP_ID || 'COLE_SEU_APP_ID_AQUI',
};

const content = `// Arquivo gerado automaticamente pelo build.
// Configure as variaveis VITE_FIREBASE_* na Vercel para habilitar o multiplayer online.
window.FIREBASE_CONFIG = ${JSON.stringify(config, null, 2)};
`;

fs.writeFileSync('firebase-config.js', content, 'utf8');
console.log('firebase-config.js gerado');
