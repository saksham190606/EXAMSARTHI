import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TextSize = 'default' | 'large' | 'xlarge';
export type Contrast = 'default' | 'high';
export type VoiceSpeed = 'slow' | 'normal' | 'fast';
export type Language = 'en' | 'hi';

interface AccessibilityState {
  textSize: TextSize;
  contrast: Contrast;
  reducedMotion: boolean;
  audioAssistance: boolean;
  autoReadQuestions: boolean;
  enableVoiceCommands: boolean;
  voiceSpeed: VoiceSpeed;
  language: Language;

  // Actions
  setTextSize: (size: TextSize) => void;
  setContrast: (contrast: Contrast) => void;
  setReducedMotion: (enabled: boolean) => void;
  setAudioAssistance: (enabled: boolean) => void;
  setAutoReadQuestions: (enabled: boolean) => void;
  setEnableVoiceCommands: (enabled: boolean) => void;
  setVoiceSpeed: (speed: VoiceSpeed) => void;
  setLanguage: (lang: Language) => void;
}

export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set) => ({
      textSize: 'default',
      contrast: 'default',
      reducedMotion: false,
      audioAssistance: false,
      autoReadQuestions: false,
      enableVoiceCommands: false,
      voiceSpeed: 'normal',
      language: 'en',

      setTextSize: (size) => set({ textSize: size }),
      setContrast: (contrast) => set({ contrast: contrast }),
      setReducedMotion: (enabled) => set({ reducedMotion: enabled }),
      setAudioAssistance: (enabled) => set({ audioAssistance: enabled }),
      setAutoReadQuestions: (enabled) => set({ autoReadQuestions: enabled }),
      setEnableVoiceCommands: (enabled) => set({ enableVoiceCommands: enabled }),
      setVoiceSpeed: (speed) => set({ voiceSpeed: speed }),
      setLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: 'examsarthi-accessibility', // unique name for localStorage key
    }
  )
);
