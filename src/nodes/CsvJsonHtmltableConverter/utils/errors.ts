export interface ErrorMetadata {
  source?: string;
  target?: string;
}

export class ConversionError extends Error {
  source?: string;
  target?: string;

  constructor(message: string, metadata: ErrorMetadata) {
    super(message);
    this.name = 'ConversionError';
    this.source = metadata.source;
    this.target = metadata.target;
  }
}

export class ValidationError extends Error {
  source?: string;
  target?: string;

  constructor(message: string, metadata: ErrorMetadata) {
    super(message);
    this.name = 'ValidationError';
    this.source = metadata.source;
    this.target = metadata.target;
  }
}
