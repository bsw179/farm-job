// src/store/useJobStore.js
import { create } from 'zustand';

export const useJobStore = create((set) => ({
  jobData: {
    jobType: '',
    cropYear: new Date().getFullYear(),
    vendor: '',
    applicator: '',
    products: [],
    fields: [],
  },
  setJobData: (data) => set({ jobData: data }),
  updateJobField: (key, value) =>
    set((state) => ({
      jobData: { ...state.jobData, [key]: value },
    })),
  clearJob: () =>
    set({
      jobData: {
        jobType: '',
        cropYear: new Date().getFullYear(),
        vendor: '',
        applicator: '',
        products: [],
        fields: [],
      },
    }),
}));
