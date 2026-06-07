"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import ConfiguratorLayout from "@/components/ConfiguratorLayout";
import OptionSection from "@/components/OptionSection";
import OptionCard from "@/components/OptionCard";
import { getStepData } from "@/data";
import { useAdminConfig } from "@/contexts/AdminConfigContext";
import { useConfigurator } from "@/contexts/ConfiguratorContext";
import { StepId } from "@/types/configurator";
import { DEFAULT_STEP } from "@/constants/steps";

const ATTR_KEYS = [
  "gclid",
  "gbraid",
  "wbraid",
  "gad_source",
  "gad_campaignid",
  "gclsrc",
  "_gl",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_id",
  "utm_term",
  "utm_content",
];
const ATTR_SESSION_KEY = "saunamo_attribution";

function withCurrentSearch(path: string): string {
  if (typeof window === "undefined") return path;

  const current = new URLSearchParams(window.location.search);
  if ([...current.keys()].length > 0) return `${path}?${current.toString()}`;

  try {
    const stored = sessionStorage.getItem(ATTR_SESSION_KEY);
    const attribution = stored ? JSON.parse(stored) as Record<string, string> : {};
    const params = new URLSearchParams();
    ATTR_KEYS.forEach((key) => {
      const value = attribution[key];
      if (value) params.set(key, value);
    });
    const query = params.toString();
    return query ? `${path}?${query}` : path;
  } catch {
    return path;
  }
}

export default function ConfiguratorStepPage() {
  const params = useParams();
  const router = useRouter();
  const step = params.step as string;
  const { config } = useAdminConfig();
  
  // Use admin config if available, otherwise fall back to default
  const stepData = config?.stepData[step] || getStepData(step);

  const { getSelection, updateSelection } = useConfigurator();

  useEffect(() => {
    if (!stepData) {
      router.push(withCurrentSearch(DEFAULT_STEP.route));
    }
  }, [stepData, router]);

  if (!stepData) {
    return null;
  }

  const selectedIds = getSelection(stepData.stepId);

  const handleToggle = (optionId: string) => {
    if (stepData.selectionType === "single") {
      // Single select: replace selection
      updateSelection(stepData.stepId, [optionId]);
    } else {
      // Multi select: toggle selection
      if (selectedIds.includes(optionId)) {
        updateSelection(
          stepData.stepId,
          selectedIds.filter((id) => id !== optionId)
        );
      } else {
        updateSelection(stepData.stepId, [...selectedIds, optionId]);
      }
    }
  };

  return (
    <ConfiguratorLayout
      currentStepId={stepData.stepId as StepId}
      stepData={stepData}
    >
      <OptionSection
        title={stepData.title}
        description={stepData.description}
        subtext={stepData.subtext}
      >
        {stepData.options.map((option) => (
          <OptionCard
            key={option.id}
            option={option}
            isSelected={selectedIds.includes(option.id)}
            selectionType={stepData.selectionType}
            onToggle={() => handleToggle(option.id)}
          />
        ))}
      </OptionSection>
    </ConfiguratorLayout>
  );
}
