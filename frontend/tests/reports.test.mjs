import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import ts from 'typescript'
const source = readFileSync(new URL('../src/lib/reports.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { chatReport, tableReport } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))

test('only selected answers are included with their own question and citations', () => {
  const result = chatReport({ title: 'Marks', messages: [
    { id: 'q1', role: 'user', content: 'Highest score?' },
    { id: 'a1', role: 'assistant', content: '90', sources: [{ filename: 'marks.xlsx', page: 1, location_kind: 'sheet', label: 'Marks' }] },
    { id: 'q2', role: 'user', content: 'Lowest score?' },
    { id: 'a2', role: 'assistant', content: 'ZERO' },
  ] }, ['a1'])
  assert.match(result, /Highest score/)
  assert.match(result, /marks.xlsx.*sheet 1.*Marks/)
  assert.doesNotMatch(result, /Lowest score|ZERO/)
})
test('tables retain locations, warnings, zero values and escaped delimiters', () => {
  const result = tableReport({ filename: 'marks.xlsx', page_count: 1, table_count: 1, location_kind: 'sheet', pages: [
    { page: 1, label: 'Marks', warnings: ['Saved formula values'], tables: [{ title: 'Scores', rows: [['Name', 'Score'], ['A|B', '0']] }] }
  ] })
  assert.match(result, /sheet 1/)
  assert.match(result, /Saved formula values/)
  assert.ok(result.includes('| A\\|B | 0 |'))
  assert.ok(result.includes('| Name | Score |\n| --- | --- |'))
})
test('empty table results are explicit', () => {
  assert.match(tableReport({filename:'empty.pdf', page_count:1, table_count:0, location_kind:'page', pages:[{page:1, warnings:[],tables:[]}]}), /No tables detected/)
})
