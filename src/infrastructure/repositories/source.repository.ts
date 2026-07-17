import type { Source, CreateSourceInput, UpdateSourceInput, SourceType } from '@domain/source/index.js';

export interface SourceRepository {
  create(input: CreateSourceInput): Promise<Source>;
  findById(id: string): Promise<Source | null>;
  findAll(): Promise<Source[]>;
  update(id: string, input: UpdateSourceInput): Promise<Source>;
  delete(id: string): Promise<void>;
  findActive(): Promise<Source[]>;
  findByType(type: SourceType): Promise<Source[]>;
}