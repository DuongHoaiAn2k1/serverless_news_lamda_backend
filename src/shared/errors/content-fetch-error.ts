import { ApplicationError } from './application-error.js';

export class ContentFetchError extends ApplicationError {
  public readonly url: string;

  constructor(message: string, url: string, code: string = 'CONTENT_FETCH_ERROR') {
    super(message, code, 502);
    this.name = 'ContentFetchError';
    this.url = url;
  }
}