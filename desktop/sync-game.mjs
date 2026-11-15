// Собирает папку ./game для оболочки: новая ПК-игра из ../pc плюс данные карты из ../dist.
import {cp, rm, copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(here, '..', 'pc'), target = path.join(here, 'game');
await rm(target, {recursive: true, force: true});
await cp(source, target, {recursive: true});
await copyFile(path.join(here, '..', 'dist', 'city-data.js'), path.join(target, 'data', 'city-data.js'));
console.log('Игра собрана в', target);
