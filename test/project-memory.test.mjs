import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply } from '../index.mjs'

test('registers labeled project context and read-only lookup', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-project-memory-'))
  await writeFile(join(root, 'MEMORY.md'), '# Memory\n- Use SQLite for offline storage.\n- Do not add cloud sync.\n')
  let context
  let tool
  let turnStopping
  const ctx = {
    effect: (fn) => fn(),
    systemPrompt: { context: (value) => { context = value } },
    tools: { register: (value) => { tool = value } },
    on: (name, handler) => { if (name === 'agent/turn-stopping') turnStopping = handler },
  }
  apply(ctx, { fileName: 'MEMORY.md', candidateFileName: '.dsh-memory-candidates.md', maxChars: 6000, maxMatches: 6, lazyMode: true, maxCandidates: 20, maxCandidateChars: 6000 })
  const prompt = context.text({ agent: { session: { header: { cwd: root } } } })
  assert.match(prompt, /human-maintained/)
  assert.match(prompt, /updated:/)
  assert.match(prompt, /SQLite/)
  const value = await tool.execute({ query: 'offline storage' }, { agent: { session: { header: { cwd: root } } } })
  assert.equal(value.found, true)
  assert.match(value.excerpt, /SQLite/)
  assert.equal(value.truncated, false)
  assert.match(value.updatedAt, /T/)
  turnStopping({ agent: { session: { id: 'test', header: { cwd: root }, events: [
    { seq: 1, type: 'user/message', data: { source: { kind: 'plugin' }, content: [{ type: 'text', text: 'System runtime context must not be captured.' }] } },
    { seq: 2, type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text: '把 SQLite 换成 DuckDB，\n离线优先。' }] } },
  ] } } })
  const proposals = readFileSync(join(root, '.dsh-memory-candidates.md'), 'utf8')
  assert.match(proposals, /DuckDB， 离线优先/)
  assert.doesNotMatch(proposals, /DuckDB，\n/)
  assert.doesNotMatch(proposals, /runtime context/)
  assert.doesNotMatch(readFileSync(join(root, 'MEMORY.md'), 'utf8'), /DuckDB/)
})
