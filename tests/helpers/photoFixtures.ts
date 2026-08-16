import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type Orientation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type PhotoFixtureName = `orientation-${Orientation}.jpg` | 'sample.png';

const fixtureDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../integration/fixtures',
);

export const orientationFixtureNames: readonly PhotoFixtureName[] = [
  'orientation-1.jpg',
  'orientation-2.jpg',
  'orientation-3.jpg',
  'orientation-4.jpg',
  'orientation-5.jpg',
  'orientation-6.jpg',
  'orientation-7.jpg',
  'orientation-8.jpg',
];

export const fixtureNames: readonly PhotoFixtureName[] = [...orientationFixtureNames, 'sample.png'];

export function photoFixturePath(name: PhotoFixtureName): string {
  return resolve(fixtureDirectory, name);
}

export async function readPhotoFixture(name: PhotoFixtureName): Promise<Uint8Array> {
  return new Uint8Array(await readFile(photoFixturePath(name)));
}

export async function createPhotoFixtureFile(name: PhotoFixtureName): Promise<File> {
  const bytes = await readPhotoFixture(name);
  const type = name.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return new File([bytes.buffer as ArrayBuffer], name, { type });
}
