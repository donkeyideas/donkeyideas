import { api } from './client';

export interface Card {
  id: string;
  title: string;
  description?: string;
  position: number;
  tags?: string[];
  columnId: string;
  createdAt: string;
  priority?: string;
  status?: string;
}

export interface Column {
  id: string;
  name: string;
  position: number;
  boardId: string;
  cards: Card[];
}

export interface Board {
  id: string;
  name: string;
  companyId: string;
  columns: Column[];
}

export async function getConsolidatedBoards(): Promise<Board[]> {
  const { data } = await api.get('/companies/consolidated/boards');
  return data.boards || data;
}
