'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getDB } from '@/lib/db';
import { TimerState } from '@/types';
import { useTimeEntries } from './useTimeEntries';

const localDateString = (d: Date): string => {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const computeElapsedSeconds = (state: TimerState): number => {
  if (state.status === 'paused') return state.accumulated_seconds;
  const started = new Date(state.started_at).getTime();
  return state.accumulated_seconds + Math.floor((Date.now() - started) / 1000);
};

export const useTimer = () => {
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [frozenMinutes, setFrozenMinutes] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { addEntry } = useTimeEntries();

  useEffect(() => {
    const load = async () => {
      const db = await getDB();
      const state = await db.get('timer_state', 'active');
      if (state) {
        setTimerState(state);
        setElapsedSeconds(computeElapsedSeconds(state));
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (timerState && timerState.status === 'running') {
      const tick = () => setElapsedSeconds(computeElapsedSeconds(timerState));
      tick();
      intervalRef.current = setInterval(tick, 1000);
    } else if (timerState) {
      setElapsedSeconds(computeElapsedSeconds(timerState));
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerState]);

  const startTimer = useCallback(async (customer_id: string, session_type_id: string) => {
    const db = await getDB();
    const state: TimerState = {
      key: 'active',
      customer_id,
      session_type_id,
      started_at: new Date().toISOString(),
      status: 'running',
      accumulated_seconds: 0,
    };
    await db.put('timer_state', state);
    setTimerState(state);
    setFrozenMinutes(null);
  }, []);

  const pauseTimer = useCallback(async () => {
    if (!timerState || timerState.status !== 'running') return;
    const db = await getDB();
    const state: TimerState = {
      ...timerState,
      status: 'paused',
      accumulated_seconds: computeElapsedSeconds(timerState),
    };
    await db.put('timer_state', state);
    setTimerState(state);
  }, [timerState]);

  const resumeTimer = useCallback(async () => {
    if (!timerState || timerState.status !== 'paused') return;
    const db = await getDB();
    const state: TimerState = {
      ...timerState,
      status: 'running',
      started_at: new Date().toISOString(),
    };
    await db.put('timer_state', state);
    setTimerState(state);
  }, [timerState]);

  const stopTimer = useCallback((): number => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!timerState) return 0;
    const totalSeconds = computeElapsedSeconds(timerState);
    const duration = Math.max(1, Math.round(totalSeconds / 60));
    setFrozenMinutes(duration);
    return duration;
  }, [timerState]);

  const saveSession = useCallback(
    async (duration_minutes: number, notes: string) => {
      if (!timerState) return;
      const db = await getDB();
      await addEntry({
        customer_id: timerState.customer_id,
        session_type_id: timerState.session_type_id,
        duration_minutes,
        notes: notes || null,
        entry_date: localDateString(new Date()),
        started_at: timerState.started_at,
        ended_at: new Date().toISOString(),
      });
      await db.delete('timer_state', 'active');
      setTimerState(null);
      setFrozenMinutes(null);
      setElapsedSeconds(0);
    },
    [timerState, addEntry]
  );

  const discardSession = useCallback(async () => {
    const db = await getDB();
    await db.delete('timer_state', 'active');
    setTimerState(null);
    setFrozenMinutes(null);
    setElapsedSeconds(0);
  }, []);

  return {
    timerState,
    isRunning: !!timerState && timerState.status === 'running' && frozenMinutes === null,
    isPaused: !!timerState && timerState.status === 'paused' && frozenMinutes === null,
    isStopped: !!timerState && frozenMinutes !== null,
    elapsedSeconds,
    frozenMinutes,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    saveSession,
    discardSession,
  };
};
