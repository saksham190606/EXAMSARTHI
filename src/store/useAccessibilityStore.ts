import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TextSize = 'default' | 'large' | 'xlarge';
export type Contrast = 'default' | 'high';
export type VoiceSpeed = 'slow' | 'normal' | 'fast';
export type Language = 'en' | 'hi';
export type AccessibilityMode = 'voice' | 'keyboard';

interface AccessibilityState {
  textSize: TextSize;
  contrast: Contrast;
  reducedMotion: boolean;
  audioAssistance: boolean;
  autoReadQuestions: boolean;
  enableVoiceCommands: boolean;
  voiceSpeed: VoiceSpeed;
  speechRate: number;
  selectedVoiceURI: string | null;
  voiceModeEnabled: boolean;
  hasAnnouncedWelcome: boolean;
  isListeningCommands: boolean;
  language: Language;
  accessibilityMode: AccessibilityMode;

  // Actions
  setTextSize: (size: TextSize) => void;
  setContrast: (contrast: Contrast) => void;
  setReducedMotion: (enabled: boolean) => void;
  setAudioAssistance: (enabled: boolean) => void;
  setAutoReadQuestions: (enabled: boolean) => void;
  setEnableVoiceCommands: (enabled: boolean) => void;
  setVoiceSpeed: (speed: VoiceSpeed) => void;
  setSpeechRate: (rate: number) => void;
  setSelectedVoiceURI: (uri: string | null) => void;
  setVoiceModeEnabled: (enabled: boolean) => void;
  setHasAnnouncedWelcome: (announced: boolean) => void;
  setIsListeningCommands: (listening: boolean) => void;
  setLanguage: (lang: Language) => void;
  setAccessibilityMode: (mode: AccessibilityMode) => void;
}

export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set) => ({
      textSize: 'default',
      contrast: 'default',
      reducedMotion: false,
      audioAssistance: true,
      autoReadQuestions: true,
      enableVoiceCommands: true,
      voiceSpeed: 'normal',
      speechRate: 1.0,
      selectedVoiceURI: null,
      voiceModeEnabled: true,
      hasAnnouncedWelcome: false,
      isListeningCommands: true,
      language: 'en',
      accessibilityMode: 'voice',

      setTextSize: (size) => set({ textSize: size }),
      setContrast: (contrast) => set({ contrast: contrast }),
      setReducedMotion: (enabled) => set({ reducedMotion: enabled }),
      setAudioAssistance: (enabled) => set({ audioAssistance: enabled }),
      setAutoReadQuestions: (enabled) => set({ autoReadQuestions: enabled }),
      setEnableVoiceCommands: (enabled) => set({ enableVoiceCommands: enabled }),
      setVoiceSpeed: (speed) => {
        const speedMap: Record<VoiceSpeed, number> = {
          slow: 0.8,
          normal: 1.0,
          fast: 1.2,
        };
        set({ voiceSpeed: speed, speechRate: speedMap[speed] || 1.0 });
      },
      setSpeechRate: (rate) => set({ speechRate: rate }),
      setSelectedVoiceURI: (uri) => set({ selectedVoiceURI: uri }),
      setVoiceModeEnabled: (enabled) => set({ voiceModeEnabled: enabled }),
      setHasAnnouncedWelcome: (announced) => set({ hasAnnouncedWelcome: announced }),
      setIsListeningCommands: (listening) => set({ isListeningCommands: listening }),
      setLanguage: (lang) => set({ language: lang }),
      setAccessibilityMode: (mode) => {
        if (mode === 'keyboard') {
          if (typeof window !== 'undefined') {
            (window as any).__alwaysListening = false;
            try {
              window.speechSynthesis?.cancel();
            } catch (_) {}
          }
          set({
            accessibilityMode: 'keyboard',
            voiceModeEnabled: false,
            audioAssistance: false,
            enableVoiceCommands: false,
            autoReadQuestions: false,
            isListeningCommands: false,
          });
        } else {
          if (typeof window !== 'undefined') {
            (window as any).__alwaysListening = true;
          }
          set({
            accessibilityMode: 'voice',
            voiceModeEnabled: true,
            audioAssistance: true,
            enableVoiceCommands: true,
            autoReadQuestions: true,
            isListeningCommands: true,
          });
        }
      },
    }),
    {
      name: 'examsarthi-accessibility', // unique name for localStorage key
      partialize: (state) => ({
        textSize: state.textSize,
        contrast: state.contrast,
        reducedMotion: state.reducedMotion,
        audioAssistance: state.audioAssistance,
        autoReadQuestions: state.autoReadQuestions,
        enableVoiceCommands: state.enableVoiceCommands,
        voiceSpeed: state.voiceSpeed,
        speechRate: state.speechRate,
        selectedVoiceURI: state.selectedVoiceURI,
        language: state.language,
        accessibilityMode: state.accessibilityMode,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.accessibilityMode === 'keyboard') {
            state.voiceModeEnabled = false;
            state.audioAssistance = false;
            state.enableVoiceCommands = false;
            state.isListeningCommands = false;
            state.autoReadQuestions = false;
            if (typeof window !== 'undefined') {
              (window as any).__alwaysListening = false;
            }
          } else {
            state.accessibilityMode = 'voice';
            state.enableVoiceCommands = true;
            state.voiceModeEnabled = true;
            state.isListeningCommands = true;
            state.audioAssistance = true;
            if (typeof window !== 'undefined') {
              (window as any).__alwaysListening = true;
            }
          }
        }
      },
    }
  )
);
