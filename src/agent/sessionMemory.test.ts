import { SessionMemory } from '@/agent/sessionMemory'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

it('changedFiles deduplication', () => {
  const memory = new SessionMemory()

  memory.recordFile('123')
  memory.recordFile('456')

  expect(memory.snapShot().changedFiles).toStrictEqual(['123', '456'])
})

it('beginTasks clear previous state', () => {
  const memory = new SessionMemory()

  memory.beginTask('task A', '123')
  memory.recordFile('file 1')
  memory.recordDecision('edit file 1')
  memory.setNextSteps(['continue task A'])

  memory.beginTask('task B', '123')

  const snapshot = memory.snapShot()
  expect(snapshot.currentTask).toBe('task B')
  expect(snapshot.changedFiles).toStrictEqual([])
  expect(snapshot.decisions).toStrictEqual([])
  expect(snapshot.nextSteps).toStrictEqual([])
})

it('prompt, only including latest states and warning', () => {
  const memory = new SessionMemory()

  memory.beginTask('validate before publish', '123')
  memory.recordDecision('do not skip failure test')
  memory.setNextSteps(['locate the error'])

  const prompt = memory.toPromptBlock()
  expect(prompt).match(/Phase: working/)
  expect(prompt).match(/do not skip failure test/)
  expect(prompt).match(/Re-check files and decisions/)
})
