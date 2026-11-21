// src/lib/models/content-deck/contentDeckModels.ts

export interface ContentDeckData {
  id: number;
  name: string; // Deck Name
  dueByType: 'none' | 'relative' | 'fixed';
  dueDate?: string; // ISO date string
  notifyOnEdit: boolean;
  thumbnailUrl?: string;
  assignedTo: Array<{
    role: string;
    attribute: string;
    value: string;
    logic?: 'AND' | 'OR';
  }>;
  status: 'active' | 'inactive';
}

