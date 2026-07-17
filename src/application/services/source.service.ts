import type { Source, CreateSourceInput, UpdateSourceInput } from '@domain/source/index.js';
import { SourceStatus } from '@domain/source/index.js';
import { createSourceSchema, updateSourceSchema } from '@domain/source/index.js';
import type { SourceRepository } from '@infrastructure/repositories/source.repository.js';
import { validateOrThrow } from '@shared/validation/index.js';
import { NotFoundError } from '@shared/errors/index.js';
import type { Logger } from '@shared/logger/index.js';

export class SourceService {
  constructor(
    private readonly sourceRepository: SourceRepository,
    private readonly logger: Logger,
  ) {}

  async create(input: CreateSourceInput): Promise<Source> {
    const validated = validateOrThrow(createSourceSchema, input);
    this.logger.info('Create Source', { name: validated.name });
    return this.sourceRepository.create(validated);
  }

  async findById(id: string): Promise<Source> {
    this.logger.info('Find Source by ID', { sourceId: id });
    const source = await this.sourceRepository.findById(id);
    if (!source) {
      throw new NotFoundError('Source', id);
    }
    return source;
  }

  async findAll(): Promise<Source[]> {
    this.logger.info('Find All Sources');
    return this.sourceRepository.findAll();
  }

  async findActive(): Promise<Source[]> {
    this.logger.info('Find Active Sources');
    return this.sourceRepository.findActive();
  }

  async update(id: string, input: UpdateSourceInput): Promise<Source> {
    const validated = validateOrThrow(updateSourceSchema, input);
    this.logger.info('Update Source', { sourceId: id });

    // Verify source exists
    await this.findById(id);

    return this.sourceRepository.update(id, validated);
  }

  async delete(id: string): Promise<void> {
    this.logger.info('Delete Source', { sourceId: id });

    // Verify source exists
    await this.findById(id);

    return this.sourceRepository.delete(id);
  }

  async toggleStatus(id: string): Promise<Source> {
    this.logger.info('Toggle Source Status', { sourceId: id });

    const source = await this.findById(id);
    const newStatus = source.status === SourceStatus.ACTIVE ? SourceStatus.INACTIVE : SourceStatus.ACTIVE;

    this.logger.info('Toggle Source', { sourceId: id, newStatus });

    return this.sourceRepository.update(id, { status: newStatus });
  }
}