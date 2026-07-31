import { create } from 'zustand';

export interface MarketplacePlugin {
  id: string;
  name: string;
  author: string;
  description: string;
  version: string;
  downloads: number;
  rating: number;
  isVerified: boolean;
  category: 'intelligence' | 'ui' | 'workflow' | 'tool';
}

interface MarketplaceState {
  availablePlugins: MarketplacePlugin[];
  isLoading: boolean;

  fetchPlugins: () => Promise<void>;
  installPlugin: (id: string) => Promise<void>;
}

export const useMarketplaceStore = create<MarketplaceState>((set) => ({
  availablePlugins: [],
  isLoading: false,

  fetchPlugins: async () => {
    set({ isLoading: true });
    // Mocking remote fetch
    const mockPlugins: MarketplacePlugin[] = [
      {
        id: 'io.blueprint.community.flutter-intel',
        name: 'Flutter Intelligence',
        author: 'Google',
        description: 'Deep analysis of Flutter widgets and state management.',
        version: '1.2.0',
        downloads: 1250,
        rating: 4.8,
        isVerified: true,
        category: 'intelligence'
      },
      {
        id: 'io.blueprint.community.aws-deploy',
        name: 'AWS CDK Deployer',
        author: 'Amazon',
        description: 'Automated infrastructure-as-code planning and deployment.',
        version: '0.9.0',
        downloads: 840,
        rating: 4.5,
        isVerified: true,
        category: 'tool'
      }
    ];

    setTimeout(() => {
      set({ availablePlugins: mockPlugins, isLoading: false });
    }, 500);
  },

  installPlugin: async (id) => {
    console.log(`Installing marketplace plugin: ${id}`);
    // This would eventually download and move files to ~/.blueprint/plugins
  }
}));
