// Prueba local de la limpieza y del diccionario, sin llamar a ninguna IA.
// Uso: npm run try -- samples/compilacion-156.txt
import fs from 'node:fs';
import { preprocess } from '../lib/preprocess.js';
import { loadDictionary, createTranslator } from '../lib/dictionary.js';

const file = process.argv[2];
if (!file) {
  console.error('Uso: npm run try -- <archivo.txt>');
  process.exit(1);
}

const result = preprocess(fs.readFileSync(file, 'utf8'));
const { translate, used } = createTranslator(loadDictionary());

console.log(`Compilación: ${result.number ?? '(no detectada)'}`);
console.log(`Cabecera: ${result.header || '(vacía)'}\n`);
console.log(`Entradas incluidas (${result.entries.length}):`);
result.entries.forEach((e, i) => console.log(`\n${i + 1}. [${e.category}] ${translate(e.text)}`));
console.log(`\nEntradas excluidas (${result.excluded.length}):`);
result.excluded.forEach((e) => console.log(`  - [${e.category}] (${e.status}) ${e.summary}`));
console.log(`\nTérminos del diccionario aplicados: ${used().join(', ') || '(ninguno)'}`);
