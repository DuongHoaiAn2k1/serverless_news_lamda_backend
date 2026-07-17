import { ApplicationError } from './application-error.js';

export class NotFoundError extends ApplicationError {
  constructor(resource: string, id: string) {
    super(`${resource} with id '${id}' not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}