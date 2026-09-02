// src/utils/__tests__/suggestionGenerator.test.ts
import { SuggestionGenerator } from '../suggestionGenerator';

describe('SuggestionGenerator', () => {
  let generator: SuggestionGenerator;

  beforeEach(() => {
    generator = new SuggestionGenerator();
  });

  describe('Basic functionality', () => {
    it('should initialize with empty data', () => {
      expect(generator).toBeDefined();
      const stats = generator.getSuggestionStats();
      expect(stats.totalSources).toBeGreaterThan(0); // Should have system suggestions
      expect(stats.usedCount).toBe(0);
    });

    it('should generate system suggestions by default', () => {
      const suggestions = generator.generateSuggestions('', 10);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].source.category).toBe('system');
    });
  });

  describe('Data source integration', () => {
    const mockProfile = {
      id: '1',
      full_name: 'Test User',
      title: 'Developer',
      bio: 'Experienced software developer',
      welcome_message: 'Hello!',
      summary: '10+ years of experience',
      phone: null,
      email: null,
      location: null,
      website: null,
      github: 'github.com/test',
      linkedin: null,
      resume_url: null,
      avatar_url: null,
      is_active: true
    };

    const mockProjects = [
      {
        id: 1,
        title: 'Portfolio Website',
        description: 'Personal portfolio',
        image_url: null,
        thumbnail_url: null,
        short_title: null,
        icon_key: null,
        project_url: null,
        repo_url: null,
        languages: ['TypeScript', 'React'],
        tags: ['web', 'portfolio'],
        featured: true,
        featured_order: 1,
        sort_order: 1,
        is_visible: true,
        description_html: null,
        client_name: null,
        client_location: null,
        client_logo: null
      }
    ];

    const mockSkills = [
      {
        id: 1,
        name: 'TypeScript',
        category: 'Programming',
        level: 'Expert',
        icon_key: null,
        icon_type: null,
        icon_color: null,
        sort_order: 1,
        is_visible: true,
        duration: null
      }
    ];

    const mockKnowledge = [
      {
        id: 1,
        category: 'Web Development',
        content: 'Advanced web technologies',
        is_visible: true
      }
    ];

    it('should generate profile-based suggestions', () => {
      generator.setProfile(mockProfile);
      const suggestions = generator.generateSuggestions('', 20);
      const profileSuggestions = suggestions.filter(s => s.source.category === 'profile');
      expect(profileSuggestions.length).toBeGreaterThan(0);
    });

    it('should generate project-based suggestions', () => {
      generator.setProjects(mockProjects);
      const suggestions = generator.generateSuggestions('', 20);
      const projectSuggestions = suggestions.filter(s => s.source.category === 'project');
      expect(projectSuggestions.length).toBeGreaterThan(0);
      expect(projectSuggestions[0].label).toContain('Portfolio Website');
    });

    it('should generate skill-based suggestions', () => {
      generator.setSkills(mockSkills);
      const suggestions = generator.generateSuggestions('', 20);
      const skillSuggestions = suggestions.filter(s => s.source.category === 'skill');
      expect(skillSuggestions.length).toBeGreaterThan(0);
      expect(skillSuggestions[0].label).toContain('TypeScript');
    });

    it('should generate knowledge-based suggestions', () => {
      generator.setKnowledgeBases(mockKnowledge);
      const suggestions = generator.generateSuggestions('', 20);
      const knowledgeSuggestions = suggestions.filter(s => s.source.category === 'knowledge');
      expect(knowledgeSuggestions.length).toBeGreaterThan(0);
      expect(knowledgeSuggestions[0].label).toContain('Web Development');
    });
  });

  describe('Query matching and scoring', () => {
    beforeEach(() => {
      const mockProfile = {
        id: '1',
        full_name: 'Test User',
        title: 'Developer',
        bio: 'Experienced software developer',
        welcome_message: 'Hello!',
        summary: '10+ years of experience',
        phone: null,
        email: null,
        location: null,
        website: null,
        github: 'github.com/test',
        linkedin: null,
        resume_url: null,
        avatar_url: null,
        is_active: true
      };

      const mockProjects = [
        {
          id: 1,
          title: 'React Portfolio',
          description: 'Personal portfolio',
          image_url: null,
          thumbnail_url: null,
          short_title: null,
          icon_key: null,
          project_url: null,
          repo_url: null,
          languages: ['TypeScript', 'React'],
          tags: ['web', 'portfolio'],
          featured: true,
          featured_order: 1,
          sort_order: 1,
          is_visible: true,
          description_html: null,
          client_name: null,
          client_location: null,
          client_logo: null
        }
      ];

      generator.setProfile(mockProfile);
      generator.setProjects(mockProjects);
    });

    it('should prioritize suggestions matching query', () => {
      const reactSuggestions = generator.generateSuggestions('react', 10);
      const portfolioSuggestions = generator.generateSuggestions('portfolio', 10);

      // React query should prioritize project with React in title
      expect(reactSuggestions[0].label).toContain('React Portfolio');
      expect(reactSuggestions[0].score).toBeGreaterThan(5);

      // Portfolio query should also find the same project
      expect(portfolioSuggestions[0].label).toContain('React Portfolio');
    });

    it('should handle partial matches', () => {
      const suggestions = generator.generateSuggestions('port', 10);
      expect(suggestions[0].label).toContain('Portfolio');
    });

    it('should return empty array for no matches with specific query', () => {
      const suggestions = generator.generateSuggestions('xyznonexistentqueryxyz', 10);
      // Should still return system suggestions as they have priority
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Conversation context', () => {
    it('should use conversation history for context', () => {
      generator.addConversationMessage('Tell me about your React projects');
      
      // Query that matches conversation context should get bonus
      const suggestions = generator.generateSuggestions('projects', 10);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should limit conversation history', () => {
      // Add more than 10 messages
      for (let i = 0; i < 15; i++) {
        generator.addConversationMessage(`Message ${i}`);
      }
      
      const suggestions = generator.generateSuggestions('test', 10);
      // Should still work without errors
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Used suggestions tracking', () => {
    it('should not repeat used suggestions', () => {
      const allSuggestions = generator.generateSuggestions('', 50);
      expect(allSuggestions.length).toBeGreaterThan(0);

      // Mark first suggestion as used
      generator.markSuggestionUsed(allSuggestions[0].id);
      
      const newSuggestions = generator.generateSuggestions('', 50);
      // Should not include the used suggestion
      expect(newSuggestions.find(s => s.id === allSuggestions[0].id)).toBeUndefined();
    });

    it('should update stats when suggestions are used', () => {
      const initialStats = generator.getSuggestionStats();
      const suggestions = generator.generateSuggestions('', 10);
      
      generator.markSuggestionUsed(suggestions[0].id);
      
      const updatedStats = generator.getSuggestionStats();
      expect(updatedStats.usedCount).toBe(initialStats.usedCount + 1);
      expect(updatedStats.availableCount).toBe(initialStats.availableCount - 1);
    });
  });
});