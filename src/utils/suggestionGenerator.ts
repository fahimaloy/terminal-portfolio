// src/utils/suggestionGenerator.ts
import { PortfolioProfile, PortfolioProject, PortfolioSkill, PortfolioKnowledgeBase } from './api';

export type SuggestionSource = {
  id: string;
  text: string;
  category: 'profile' | 'project' | 'skill' | 'knowledge' | 'system';
  priority?: number;
  keywords?: string[];
};

export type GeneratedSuggestion = {
  id: string;
  label: string;
  source: SuggestionSource;
  score: number;
  context?: Record<string, unknown>;
};

export class SuggestionGenerator {
  private profile: PortfolioProfile | null;
  private projects: PortfolioProject[];
  private skills: PortfolioSkill[];
  private knowledgeBases: PortfolioKnowledgeBase[];
  private conversationHistory: string[];
  private usedSuggestions: Set<string>;

  constructor() {
    this.profile = null;
    this.projects = [];
    this.skills = [];
    this.knowledgeBases = [];
    this.conversationHistory = [];
    this.usedSuggestions = new Set();
  }

  public setProfile(profile: PortfolioProfile | null): void {
    this.profile = profile;
  }

  public setProjects(projects: PortfolioProject[]): void {
    this.projects = projects;
  }

  public setSkills(skills: PortfolioSkill[]): void {
    this.skills = skills;
  }

  public setKnowledgeBases(knowledgeBases: PortfolioKnowledgeBase[]): void {
    this.knowledgeBases = knowledgeBases;
  }

  public addConversationMessage(message: string): void {
    this.conversationHistory.push(message);
    // Keep only last 10 messages to limit memory
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10);
    }
  }

  public markSuggestionUsed(suggestionId: string): void {
    this.usedSuggestions.add(suggestionId);
  }

  private generateBaseSuggestions(): SuggestionSource[] {
    const sources: SuggestionSource[] = [];

    // System suggestions (always available)
    sources.push(
      { id: 'system-skills', text: 'What are your core skills?', category: 'system', priority: 10 },
      { id: 'system-projects', text: 'Tell me about your recent projects.', category: 'system', priority: 9 },
      { id: 'system-github', text: 'Where can I find your GitHub?', category: 'system', priority: 8 },
      { id: 'system-about', text: 'What is your professional background?', category: 'system', priority: 7 }
    );

    // Profile-based suggestions
    if (this.profile) {
      if (this.profile.bio) {
        sources.push({
          id: 'profile-bio', 
          text: 'Tell me more about your background and experience.',
          category: 'profile', 
          priority: 8,
          keywords: ['background', 'experience', 'bio', 'about']
        });
      }

      if (this.profile.summary) {
        sources.push({
          id: 'profile-summary',
          text: 'Can you summarize your professional journey?',
          category: 'profile',
          priority: 7,
          keywords: ['summary', 'journey', 'career', 'overview']
        });
      }
    }

    // Project-based suggestions
    this.projects.slice(0, 5).forEach((project, index) => { // Top 5 projects
      sources.push({
        id: `project-${project.id}`,
        text: `Tell me about your "${project.title}" project.`,
        category: 'project',
        priority: 9 - index,
        keywords: ['project', 'work', 'portfolio', ...(project.tags || []), ...(project.languages || [])]
      });
    });

    // Skill-based suggestions
    this.skills.slice(0, 10).forEach((skill, index) => { // Top 10 skills
      sources.push({
        id: `skill-${skill.id}`,
        text: `What is your experience with ${skill.name}?`,
        category: 'skill',
        priority: 8 - Math.floor(index / 2),
        keywords: ['skill', 'expertise', 'technology', skill.name.toLowerCase()]
      });
    });

    // Knowledge-based suggestions
    this.knowledgeBases.slice(0, 5).forEach((kb, index) => { // Top 5 knowledge areas
      sources.push({
        id: `knowledge-${kb.id}`,
        text: `What do you know about ${kb.category}?`,
        category: 'knowledge',
        priority: 7 - index,
        keywords: ['knowledge', 'expertise', 'area', kb.category.toLowerCase()]
      });
    });

    return sources;
  }

  private tokenize(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'and', 'or', 'to', 'of', 'in', 'on',
      'for', 'with', 'as', 'at', 'by', 'be', 'this', 'that', 'it', 'from'
    ]);

    return text
      .toLowerCase()
      .split(/[^a-z0-9+]+/)
      .filter((w) => w && !stopWords.has(w) && w.length > 2);
  }

  private calculateRelevanceScore(query: string, source: SuggestionSource): number {
    if (!query.trim()) return source.priority || 0;

    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return source.priority || 0;

    // Base score from priority
    let score = source.priority || 0;

    // Token matching in text
    const sourceTokens = this.tokenize(source.text);
    const textMatches = queryTokens.filter(token => 
      sourceTokens.includes(token)
    ).length;

    // Token matching in keywords
    const keywordMatches = source.keywords ? queryTokens.filter(token => 
      source.keywords!.some(keyword => keyword.includes(token))
    ).length : 0;

    // Add matches to score
    score += textMatches * 2;
    score += keywordMatches * 1.5;

    // Partial matches
    const partialMatches = queryTokens.filter(token => 
      sourceTokens.some(sourceToken => sourceToken.startsWith(token))
    ).length;
    score += partialMatches * 0.5;

    // Conversation context bonus
    if (this.conversationHistory.length > 0) {
      const recentContext = this.conversationHistory[this.conversationHistory.length - 1];
      const contextTokens = this.tokenize(recentContext);
      
      const contextMatches = queryTokens.filter(token => 
        contextTokens.includes(token)
      ).length;
      
      score += contextMatches * 0.3; // Context relevance bonus
    }

    // Category diversity bonus (to ensure variety)
    if (source.category !== 'system') {
      score += 0.2;
    }

    return score;
  }

  public generateSuggestions(query: string, limit: number = 10): GeneratedSuggestion[] {
    const sources = this.generateBaseSuggestions();
    
    // Filter out used suggestions to avoid repetition
    const availableSources = sources.filter(source => !this.usedSuggestions.has(source.id));

    // Score and sort suggestions
    const scoredSuggestions = availableSources
      .map(source => ({
        ...source,
        score: this.calculateRelevanceScore(query, source)
      }))
      .filter(source => source.score > 0) // Only keep relevant suggestions
      .sort((a, b) => b.score - a.score);

    // Convert to final suggestion format
    return scoredSuggestions.slice(0, limit).map((source, index) => ({
      id: source.id,
      label: source.text,
      source: {
        id: source.id,
        text: source.text,
        category: source.category,
        priority: source.priority
      },
      score: source.score,
      context: {
        rank: index + 1,
        totalAvailable: scoredSuggestions.length
      }
    }));
  }

  public getSuggestionStats(): {
    totalSources: number;
    usedCount: number;
    availableCount: number;
  } {
    const allSources = this.generateBaseSuggestions();
    return {
      totalSources: allSources.length,
      usedCount: this.usedSuggestions.size,
      availableCount: allSources.filter(source => !this.usedSuggestions.has(source.id)).length
    };
  }
}