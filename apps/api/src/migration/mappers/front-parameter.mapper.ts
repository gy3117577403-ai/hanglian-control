import type { FrontProcessParameterSeed } from '../../common/types/production.types';
import { documentStatusToPrisma, materialStatusToDocumentStatus } from './shared';

export function mapFrontParameterSeedToPrisma(parameter: FrontProcessParameterSeed) {
  return {
    id: parameter.id,
    productId: parameter.productId,
    wireLength: parameter.wireLength,
    strippingLength: parameter.strippingLength,
    terminalModel: parameter.terminalModel,
    pullForceStandard: parameter.pullForceStandard,
    crimpHeight: parameter.crimpHeight,
    drawingVersion: parameter.drawingVersion,
    status: documentStatusToPrisma[materialStatusToDocumentStatus[parameter.parameterStatus]],
  };
}
