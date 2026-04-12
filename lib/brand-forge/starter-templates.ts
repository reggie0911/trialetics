export interface StarterTemplate {
  id: string;
  name: string;
  therapeuticArea: string;
  brandDirection: string[];
  visualPreference: string;
  preferredColors: string[];
  keywords: string[];
  description: string;
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'oncology',
    name: 'Oncology',
    therapeuticArea: 'Oncology',
    brandDirection: ['compassionate', 'human-centered'],
    visualPreference: 'human-centered-motif',
    preferredColors: ['#4A6FA5', '#7B68A5', '#E8D5C4', '#2C3E50', '#F5F0EB'],
    keywords: ['hope', 'support', 'research', 'innovation'],
    description: 'Empathetic, hopeful palette with blues and purples. Human-centered design for oncology studies.',
  },
  {
    id: 'cardiology',
    name: 'Cardiology',
    therapeuticArea: 'Cardiology',
    brandDirection: ['clinical', 'modern'],
    visualPreference: 'scientific-motif',
    preferredColors: ['#C0392B', '#2C3E50', '#ECF0F1', '#7F8C8D', '#FFFFFF'],
    keywords: ['trust', 'precision', 'clinical', 'heart health'],
    description: 'Clean, trust-focused reds and grays. Modern sans-serif, scientific credibility.',
  },
  {
    id: 'rare-disease',
    name: 'Rare Disease',
    therapeuticArea: 'Rare Disease',
    brandDirection: ['compassionate', 'human-centered', 'global'],
    visualPreference: 'human-centered-motif',
    preferredColors: ['#D4A574', '#8B7355', '#F2E8DE', '#6B8E6B', '#3D3D3D'],
    keywords: ['community', 'advocacy', 'rare', 'together'],
    description: 'Warm earth tones. Community-centered, compassionate design.',
  },
  {
    id: 'pediatric',
    name: 'Pediatric',
    therapeuticArea: 'Other',
    brandDirection: ['compassionate', 'human-centered', 'minimal'],
    visualPreference: 'icon-based',
    preferredColors: ['#A8D8EA', '#FFD3B6', '#D5E8D4', '#FFE0E0', '#FAFAFA'],
    keywords: ['gentle', 'family', 'reassuring', 'safe'],
    description: 'Gentle pastels, rounded sans-serif. Reassuring, family-inclusive tone.',
  },
  {
    id: 'neurology',
    name: 'Neurology',
    therapeuticArea: 'Neurology',
    brandDirection: ['innovative', 'clinical', 'modern'],
    visualPreference: 'abstract-symbol',
    preferredColors: ['#1ABC9C', '#2980B9', '#ECF0F1', '#34495E', '#FFFFFF'],
    keywords: ['innovation', 'precision', 'neural', 'discovery'],
    description: 'Cool blues and teals. Modern sans-serif, innovative and precise tone.',
  },
  {
    id: 'general',
    name: 'General Clinical',
    therapeuticArea: 'Other',
    brandDirection: ['clinical', 'minimal'],
    visualPreference: 'text-based',
    preferredColors: ['#2C3E50', '#3498DB', '#ECF0F1', '#95A5A6', '#FFFFFF'],
    keywords: ['professional', 'clinical', 'trust', 'research'],
    description: 'Neutral clinical palette. Balanced serif + sans, professional tone.',
  },
];
