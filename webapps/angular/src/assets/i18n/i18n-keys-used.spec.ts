/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. Camunda licenses this file to you under the Apache License,
 * Version 2.0; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';
import { describe, it, expect } from 'vitest';

// Every literal translation key used by the code must exist in en.json, otherwise the UI
// shows the raw key. Only literals are checked: keys built at runtime cannot be found statically.
const I18N_DIR = join(__dirname);
const APP_DIR = join(__dirname, '..', '..', 'app');

const KEY_SHAPE = /^[A-Za-z][\w-]*(\.[\w-]+)+$|^[A-Z][A-Z0-9_]+$/;

const PATTERNS: RegExp[] = [
  // translateService.instant('key' ...)
  /\binstant\(\s*(['"])([^'"\r\n]+)\1/g,
  // 'key' | translate
  /(['"])([^'"\r\n]+)\1\s*\|\s*translate\b/g,
  // notifications.addError({ status: 'key', ... })
  /\bstatus:\s*(['"])([^'"\r\n]+)\1/g,
  // notifications.addSuccess('key', ...) / addWarning('key', ...)
  /\badd(?:Success|Warning)\(\s*(['"])([^'"\r\n]+)\1/g
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(path);
    }
    const isSource = entry.name.endsWith('.ts') || entry.name.endsWith('.html');
    return isSource && !entry.name.endsWith('.spec.ts') ? [path] : [];
  });
}

function usedKeys(): Map<string, string[]> {
  const keys = new Map<string, string[]>();
  for (const file of sourceFiles(APP_DIR)) {
    const content = readFileSync(file, 'utf-8');
    for (const pattern of PATTERNS) {
      for (const match of content.matchAll(pattern)) {
        const key = match[2];
        if (!KEY_SHAPE.test(key)) {
          continue;
        }
        const files = keys.get(key) ?? [];
        files.push(relative(APP_DIR, file).replace(/\\/g, '/'));
        keys.set(key, files);
      }
    }
  }
  return keys;
}

describe('i18n keys used in the code', () => {
  it('every literal key exists in en.json', () => {
    const reference: Record<string, string> = JSON.parse(readFileSync(join(I18N_DIR, 'en.json'), 'utf-8'));
    const used = usedKeys();
    expect(used.size).toBeGreaterThan(0);

    const missing = [...used.entries()]
      .filter(([key]) => !(key in reference))
      .map(([key, files]) => `${key} (${[...new Set(files)].join(', ')})`);
    expect(missing, `${missing.length} key(s) used in the code but missing in en.json:\n${missing.join('\n')}`)
      .toEqual([]);
  });
});
