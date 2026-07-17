import { SourceType } from './source-type.enum.js';
import { SourceStatus } from './source-status.enum.js';
import { FetchStrategy } from './fetch-strategy.enum.js';

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  url: string;
  status: SourceStatus;
  priority: number;
  fetchInterval: number;
  language: string;
  description: string;
  fetchStrategy: FetchStrategy;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSourceInput {
  name: string;
  type: SourceType;
  url: string;
  priority?: number;
  fetchInterval?: number;
  language?: string;
  description?: string;
  fetchStrategy?: FetchStrategy;
}

export interface UpdateSourceInput {
  name?: string;
  type?: SourceType;
  url?: string;
  status?: SourceStatus;
  priority?: number;
  fetchInterval?: number;
  language?: string;
  description?: string;
  fetchStrategy?: FetchStrategy;
}
