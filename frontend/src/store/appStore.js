import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAppStore = create(
  persist(
    (set, get) => ({
      // Connection state
      isConnected: false,
      lastSync: null,
      currentOperation: null,
      systemStatus: 'healthy',

      // Application settings
      settings: {
        wordpress: {
          source: { url: '', auth: {} },
          target: { url: '', auth: {} }
        },
        translation: {
          provider: 'google',
          apiKey: '',
          targetLanguage: 'ms'
        },
        ui: {
          theme: 'light',
          language: 'en'
        }
      },

      // Content state
      selectedPosts: [],
      translationJobs: [],
      publishingQueue: [],

      // Actions
      setConnectionStatus: (isConnected) => set({ isConnected }),

      setLastSync: (timestamp) => set({ lastSync: timestamp }),

      setCurrentOperation: (operation) => set({ currentOperation: operation }),

      setSystemStatus: (status) => set({ systemStatus: status }),

      updateSettings: (newSettings) => set(state => ({
        settings: { ...state.settings, ...newSettings }
      })),

      setSelectedPosts: (posts) => set({ selectedPosts: posts }),

      addSelectedPost: (post) => set(state => ({
        selectedPosts: [...state.selectedPosts, post]
      })),

      removeSelectedPost: (postId) => set(state => ({
        selectedPosts: state.selectedPosts.filter(p => p.id !== postId)
      })),

      clearSelectedPosts: () => set({ selectedPosts: [] }),

      addTranslationJob: (job) => set(state => ({
        translationJobs: [...state.translationJobs, job]
      })),

      updateTranslationJob: (jobId, updates) => set(state => ({
        translationJobs: state.translationJobs.map(job =>
          job.id === jobId ? { ...job, ...updates } : job
        )
      })),

      addToPublishingQueue: (items) => set(state => ({
        publishingQueue: [...state.publishingQueue, ...items]
      })),

      updatePublishingQueueItem: (itemId, updates) => set(state => ({
        publishingQueue: state.publishingQueue.map(item =>
          item.id === itemId ? { ...item, ...updates } : item
        )
      })),

      removeFromPublishingQueue: (itemId) => set(state => ({
        publishingQueue: state.publishingQueue.filter(item => item.id !== itemId)
      }))
    }),
    {
      name: 'hellokahwin-app-storage',
      partialize: (state) => ({
        settings: state.settings,
        selectedPosts: state.selectedPosts
      })
    }
  )
);