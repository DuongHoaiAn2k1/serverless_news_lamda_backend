import { ApplicationError } from './application-error.js';

export class InfrastructureError extends ApplicationError {
  public readonly service: string;

  constructor(message: string, service: string, code: string = 'INFRASTRUCTURE_ERROR') {
    super(message, code, 502);
    this.name = 'InfrastructureError';
    this.service = service;
  }
}