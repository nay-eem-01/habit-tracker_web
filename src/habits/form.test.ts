import { describe, expect, it } from 'vitest'
import type { Habit } from '../api/habits'
import { describeSchedule, EMPTY_HABIT, toRequest, valuesFromHabit } from './form'

const habit: Habit = {
  id: 1,
  name: 'Read',
  category: 'Learning',
  frequencyType: 'SPECIFIC_DAYS',
  frequencyConfig: { days: ['FRIDAY', 'MONDAY'] },
  targetCount: 2,
  reminderTime: '07:30',
  archived: false,
  createdAt: '2026-10-01T00:00:00Z',
}

describe('toRequest', () => {
  it('sends a daily habit with no schedule details', () => {
    expect(toRequest({ ...EMPTY_HABIT, name: '  Read  ' })).toEqual({
      name: 'Read',
      kind: 'BUILD',
      frequencyType: 'DAILY',
      targetCount: 1,
    })
  })

  it('sends a quit habit as daily, once, with no schedule, unit or reminder', () => {
    const values = { ...EMPTY_HABIT, name: 'Smoking', kind: 'QUIT' as const, frequencyType: 'X_TIMES_PER_WEEK' as const }
    expect(toRequest({ ...values, targetCount: '3', unit: 'cigarettes', remind: true })).toEqual({
      name: 'Smoking',
      kind: 'QUIT',
      frequencyType: 'DAILY',
      targetCount: 1,
    })
  })

  it('sends a trimmed unit and leaves out a blank one', () => {
    expect(toRequest({ ...EMPTY_HABIT, name: 'Water', targetCount: '8', unit: ' glasses ' }).unit).toBe('glasses')
    expect(toRequest({ ...EMPTY_HABIT, name: 'Water', unit: '  ' })).not.toHaveProperty('unit')
  })

  it('keeps the chosen weekdays in week order and drops the times-a-week value', () => {
    const request = toRequest({ ...EMPTY_HABIT, name: 'Run', frequencyType: 'SPECIFIC_DAYS', days: ['FRIDAY', 'MONDAY'] })
    expect(request.frequencyConfig).toEqual({ days: ['MONDAY', 'FRIDAY'] })
  })

  it('sends times a week as a number', () => {
    const request = toRequest({ ...EMPTY_HABIT, name: 'Run', frequencyType: 'X_TIMES_PER_WEEK', timesPerWeek: '4' })
    expect(request.frequencyConfig).toEqual({ timesPerWeek: 4 })
  })

  it('leaves out a blank category and an off reminder, so a replace clears them', () => {
    const request = toRequest({ ...EMPTY_HABIT, name: 'Read', category: '   ', remind: false, reminderTime: '09:00' })
    expect(request).not.toHaveProperty('category')
    expect(request).not.toHaveProperty('reminderTime')
  })

  it('sends the reminder time when it is on', () => {
    expect(toRequest({ ...EMPTY_HABIT, name: 'Read', remind: true, reminderTime: '07:30' }).reminderTime).toBe('07:30')
  })

  it('falls back to 1 when the daily target is cleared', () => {
    expect(toRequest({ ...EMPTY_HABIT, name: 'Read', targetCount: '' }).targetCount).toBe(1)
  })
})

describe('valuesFromHabit', () => {
  it('fills the form from a saved habit and turns the reminder on', () => {
    expect(valuesFromHabit(habit)).toMatchObject({
      name: 'Read',
      category: 'Learning',
      frequencyType: 'SPECIFIC_DAYS',
      days: ['FRIDAY', 'MONDAY'],
      targetCount: '2',
      remind: true,
      reminderTime: '07:30',
    })
  })

  it('treats a habit without a reminder as off', () => {
    expect(valuesFromHabit({ ...habit, reminderTime: null }).remind).toBe(false)
  })
})

describe('describeSchedule', () => {
  it('words each kind of schedule', () => {
    expect(describeSchedule({ frequencyType: 'DAILY' })).toBe('Every day')
    expect(describeSchedule(habit)).toBe('Mon, Fri')
    expect(describeSchedule({ frequencyType: 'X_TIMES_PER_WEEK', frequencyConfig: { timesPerWeek: 3 } })).toBe('3 times a week')
    expect(describeSchedule({ frequencyType: 'X_TIMES_PER_WEEK', frequencyConfig: { timesPerWeek: 1 } })).toBe('Once a week')
  })

  it('calls seven chosen days every day', () => {
    const all = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const
    expect(describeSchedule({ frequencyType: 'SPECIFIC_DAYS', frequencyConfig: { days: [...all] } })).toBe('Every day')
  })
})
