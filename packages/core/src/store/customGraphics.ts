import { create } from 'zustand';
import { CustomScreen } from '../types';

interface CustomGraphicsStore {
  customGraphics: CustomScreen[];
  setCustomGraphics: (customGraphics: CustomScreen[]) => void;
}

export const useCustomGraphicsStore = create<CustomGraphicsStore>((set) => ({
  customGraphics: [],
  setCustomGraphics: (customGraphics: CustomScreen[]) =>
    set((state) => ({
      ...state,
      customGraphics,
    })),
}));
