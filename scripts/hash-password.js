// Genera el hash bcrypt de la contraseña y un SESSION_SECRET aleatorio.
// Uso: npm run hash -- "la-contraseña"
// (La contraseña queda en el historial de la terminal; puedes borrarla después.)
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password) {
  console.error('Uso: npm run hash -- "la-contraseña"');
  process.exit(1);
}

console.log('Copia estas dos líneas en tu .env (local) y en las variables de entorno de Vercel:\n');
console.log(`APP_PASSWORD_HASH='${bcrypt.hashSync(password, 12)}'`);
console.log(`SESSION_SECRET='${crypto.randomBytes(32).toString('base64url')}'`);
console.log('\nEn Vercel pega los valores SIN las comillas simples.');
