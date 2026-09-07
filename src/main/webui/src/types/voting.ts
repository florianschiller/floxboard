export interface VotingCategory {
  id: string;
  name: string;
  color: string;
  comment?: string; // Explanatory description of category criteria
  description?: string; // Optional description alias
}

export interface WhiteboardVotingConfig {
  enabled: boolean;
  isLocked?: boolean;
  allowDuplicateVotes?: boolean;
  maxVotesPerUser: number;
  categories: VotingCategory[];
}

export interface ShapeVote {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userColor?: string;
  categoryId?: string;
  createdAt?: string;
  timestamp?: number;
}

export const DEFAULT_VOTING_CATEGORIES: VotingCategory[] = [
  {
    id: 'cat-priority',
    name: 'High Priority',
    color: '#ef4444',
    comment: 'Urgent focus and maximum strategic impact',
    description: 'Urgent focus and maximum strategic impact',
  },
  {
    id: 'cat-feasibility',
    name: 'High Feasibility',
    color: '#10b981',
    comment: 'Straightforward to execute with low technical risk',
    description: 'Straightforward to execute with low technical risk',
  },
  {
    id: 'cat-innovation',
    name: 'Innovative',
    color: '#8b5cf6',
    comment: 'Creative solution or novel product capability',
    description: 'Creative solution or novel product capability',
  },
];

export const DEFAULT_VOTING_CONFIG: WhiteboardVotingConfig = {
  enabled: true,
  isLocked: false,
  allowDuplicateVotes: true,
  maxVotesPerUser: 5,
  categories: DEFAULT_VOTING_CATEGORIES,
};
