import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../js/start-hint.js', import.meta.url), 'utf8');

test('start-hint observer does not observe the whole recipe subtree', () => {
  assert.doesNotMatch(source, /observer\.observe\(node,\s*\{\s*attributes:\s*true,\s*childList:\s*true,\s*subtree:\s*true\s*\}\)/);
  assert.match(source, /observer\.observe\(view,\s*\{\s*attributes:\s*true,\s*attributeFilter:\s*\['hidden'\]\s*\}\)/);
  assert.match(source, /observer\.observe\(title,\s*\{\s*childList:\s*true\s*\}\)/);
  assert.match(source, /observer\.observe\(servings,\s*\{\s*childList:\s*true\s*\}\)/);
});

test('start-hint avoids rewriting identical text', () => {
  assert.match(source, /if \(hint\.textContent !== nextText\) hint\.textContent = nextText;/);
});
