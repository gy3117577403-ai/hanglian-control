import { IsIn, IsOptional, IsString } from 'class-validator';

export class UploadDrawingItemDto {
  @IsString()
  title!: string;

  @IsString()
  version!: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsIn(['original_drawing', 'sop', 'finished_images', 'accessory_specs', 'notes', 'tooling'])
  moduleKey?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  keywords?: string;

  @IsOptional()
  @IsIn(['manual_upload', 'camera_capture'])
  source?: 'manual_upload' | 'camera_capture';

  @IsOptional()
  @IsIn(['environment_camera'])
  captureSource?: 'environment_camera';
}
