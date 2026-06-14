// src/types/project.ts
import { PortfolioProject } from '../utils/api';

export type ProjectMetric = number | undefined;

export type PortfolioProjectWithMetrics = PortfolioProject & {
  complexity?: ProjectMetric;
  quality?: ProjectMetric;
  momentum?: ProjectMetric;
};

export function clampMetric(value: ProjectMetric, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getProjectMetric<K extends 'complexity' | 'quality' | 'momentum'>(
  project: PortfolioProject | PortfolioProjectWithMetrics,
  key: K,
  fallback: number,
): number {
  const v = (project as PortfolioProjectWithMetrics)[key];
  return clampMetric(v, fallback);
}
