// src/context/CropYearContext.jsx
import React, { createContext, useContext, useState } from 'react';

const CropYearContext = createContext();

export function CropYearProvider({ children }) {
  const [cropYear, setCropYear] = useState(new Date().getFullYear());

  return (
    <CropYearContext.Provider value={{ cropYear, setCropYear }}>
      {children}
    </CropYearContext.Provider>
  );
}

export function useCropYear() {
  return useContext(CropYearContext);
}
