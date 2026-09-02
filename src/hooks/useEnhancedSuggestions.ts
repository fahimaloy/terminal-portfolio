// src/hooks/useEnhancedSuggestions.ts
import { useState, useEffect, useMemo } from 'react';
import {
  SuggestionGenerator,
  GeneratedSuggestion,
} from '../utils/suggestionGenerator';
import {
  useTypeaheadSuggestions,
  Suggestion as TypeaheadSuggestion,
} from '../components/ui/useTypeaheadSuggestions';
import {
  getPortfolioProfile,
  getPortfolioProjects,
  getPortfolioSkills,
  getKnowledgeBases,
} from '../utils/api';

export function useEnhancedSuggestions(
  inputValue: string,
  limit: number = 8,
  conversationHistory: string[] = [],
): {
  suggestions: TypeaheadSuggestion[];
  isLoading: boolean;
  stats: {
    totalSources: number;
    usedCount: number;
    availableCount: number;
  };
  markSuggestionUsed: (suggestionId: string) => void;
} {
  const [generator] = useState(() => new SuggestionGenerator());
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Load all data sources in parallel
        const [profile, projects, skills, knowledgeBases] = await Promise.all([
          getPortfolioProfile(),
          getPortfolioProjects(),
          getPortfolioSkills(),
          getKnowledgeBases(),
        ]);

        // Set data in generator
        generator.setProfile(profile);
        generator.setProjects(projects);
        generator.setSkills(skills);
        generator.setKnowledgeBases(knowledgeBases);

        // Add conversation history
        conversationHistory.forEach((msg) =>
          generator.addConversationMessage(msg),
        );

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to load suggestion data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [conversationHistory]);

  // Generate suggestions when input changes
  const generatedSuggestions = useMemo(() => {
    if (!isInitialized) return [];
    return generator.generateSuggestions(inputValue, limit * 2); // Generate more than needed for better selection
  }, [inputValue, isInitialized, limit, conversationHistory]);

  // Convert to typeahead format
  const suggestions = useMemo(() => {
    return generatedSuggestions.map((suggestion, index) => ({
      id: suggestion.id,
      label: suggestion.label,
      hint: suggestion.source.category,
      score: suggestion.score,
      payload: {
        source: suggestion.source.category,
        originalId: suggestion.source.id,
        rank: index + 1,
      },
    }));
  }, [generatedSuggestions]);

  // Get stats
  const stats = useMemo(() => {
    if (!isInitialized)
      return { totalSources: 0, usedCount: 0, availableCount: 0 };
    return generator.getSuggestionStats();
  }, [isInitialized, generatedSuggestions]);

  const markSuggestionUsed = (suggestionId: string) => {
    generator.markSuggestionUsed(suggestionId);
  };

  return {
    suggestions,
    isLoading,
    stats,
    markSuggestionUsed,
  };
}

// Helper hook to integrate with existing typeahead system
export function useEnhancedTypeaheadSuggestions(
  inputValue: string,
  limit: number = 5,
  conversationHistory: string[] = [],
): TypeaheadSuggestion[] {
  const { suggestions, isLoading } = useEnhancedSuggestions(
    inputValue,
    limit,
    conversationHistory,
  );

  // Always call the hook with consistent arguments
  const typeaheadSuggestions = useTypeaheadSuggestions(
    inputValue,
    suggestions,
    limit,
  );

  // Return empty array only if loading, but AFTER all hook calls
  if (isLoading) return [];

  return typeaheadSuggestions;
}
