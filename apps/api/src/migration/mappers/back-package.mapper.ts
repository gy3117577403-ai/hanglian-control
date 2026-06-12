import type { BackProcessPackageSeed } from '../../common/types/production.types';
import { documentStatusToPrisma, materialStatusToDocumentStatus } from './shared';

export function mapBackPackageSeedToPrisma(backPackage: BackProcessPackageSeed) {
  return {
    id: backPackage.id,
    productId: backPackage.productId,
    connectorModel: backPackage.connectorModel,
    assemblyManual: backPackage.assemblyManual,
    pinMap: backPackage.pinMap,
    sop: backPackage.sop,
    imageCount: backPackage.finishedImageCount,
    drawingVersion: backPackage.drawingVersion,
    sopVersion: backPackage.sopVersion,
    status: documentStatusToPrisma[materialStatusToDocumentStatus[backPackage.materialStatus]],
  };
}
