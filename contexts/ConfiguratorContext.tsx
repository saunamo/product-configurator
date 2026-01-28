"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import {
  ConfiguratorContextType,
  ConfiguratorState,
  StepId,
  StepData,
} from "@/types/configurator";

const ConfiguratorContext = createContext<ConfiguratorContextType | undefined>(
  undefined
);

export function ConfiguratorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<ConfiguratorState>({
    selections: {},
  });

  const updateSelection = useCallback((stepId: StepId, optionIds: string[]) => {
    setState((prev) => ({
      selections: {
        ...prev.selections,
        [stepId]: optionIds,
      },
    }));
  }, []);

  // Clear all selections (used when switching products)
  const clearAllSelections = useCallback(() => {
    setState({ selections: {} });
  }, []);

  const getSelection = useCallback(
    (stepId: StepId): string[] => {
      return state.selections[stepId] || [];
    },
    [state.selections]
  );

  const isStepComplete = useCallback(
    (stepId: StepId, stepData: StepData): boolean => {
      // If step is not required, always allow navigation
      if (!stepData.required) return true;
      
      // If step is required, check if there's at least one selection
      const selection = state.selections[stepId] || [];
      
      // For single-select, require exactly one selection
      if (stepData.selectionType === "single") {
        return selection.length === 1;
      }
      
      // For multi-select, require at least one selection
      return selection.length > 0;
    },
    [state.selections]
  );

  return (
    <ConfiguratorContext.Provider
      value={{
        state,
        updateSelection,
        getSelection,
        isStepComplete,
        clearAllSelections,
      }}
    >
      {children}
    </ConfiguratorContext.Provider>
  );
}

export function useConfigurator() {
  const context = useContext(ConfiguratorContext);
  if (context === undefined) {
    throw new Error(
      "useConfigurator must be used within a ConfiguratorProvider"
    );
  }
  return context;
}

