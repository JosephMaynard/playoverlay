import { create } from 'zustand';
import { Time } from '../types';

interface TimeStore {
  time: Time;
  setTime: (timeUpdates: Partial<Time>) => void;
}

export const useTimeStore = create<TimeStore>((set) => ({
  time: { paused: false },
  setTime: (timeUpdates: Partial<Time>) =>
    set((state) => {
      const time = {
        ...state.time,
        ...timeUpdates,
      };
      window?.electronAPI?.updateTime(time);
      return {
        ...state,
        time,
      };
    }),
}));
