import type { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { OperationType } from './types';
import { nodeDescription } from './nodeDescription';
import {
  handleReplaceOperation,
  handleStyleOperation,
  handleN8nObjectProcessing,
  handleRegularConversion,
  type OperationContext
} from './utils/operationHandlers';

export class CsvJsonHtmltableConverter implements INodeType {
  description: INodeTypeDescription = nodeDescription;

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const context: OperationContext = {
      executeFunctions: this,
      items,
      returnData,
    };

    try {
      // Get the operation type
      const operation = this.getNodeParameter('operation', 0) as OperationType;

      // Route to appropriate operation handler
      switch (operation) {
        case 'replace':
          return await handleReplaceOperation(context);

        case 'style':
          return await handleStyleOperation(context);

        case 'convert':
          // Check for special n8nObject processing
          if (this.getNodeParameter('sourceFormat', 0) === 'n8nObject' &&
              ['html', 'csv', 'json'].includes(this.getNodeParameter('targetFormat', 0) as string)) {
            return await handleN8nObjectProcessing(context);
          } else {
            return await handleRegularConversion(context);
          }

        default:
          throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
      }
    } catch (error) {
      // Clean up error messages
      if (error.message.includes('Error: ')) {
        throw new NodeOperationError(this.getNode(), error.message.replace('Error: ', ''));
      }
      throw new NodeOperationError(this.getNode(), error);
    }
  }
}
