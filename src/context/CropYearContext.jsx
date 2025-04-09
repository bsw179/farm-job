// src/context/CropYearContext.jsx
import { createContext, useContext, useState } from 'react';

export const CropYearContext = createContext();

export function CropYearProvider({ children }) {
  const [cropYear, setCropYear] = useState(new Date().getFullYear());

  return (
    <CropYearContext.Provider value={{ cropYear, setCropYear }}>
      {children}
    </CropYearContext.Provider>
  );
}

// Optional helper hook
export function useCropYear() {
  return useContext(CropYearContext);
}
