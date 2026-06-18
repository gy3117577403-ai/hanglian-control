import { ApiProperty } from '@nestjs/swagger';

class S3SafeStatusDto {
  @ApiProperty()
  endpointConfigured!: boolean;

  @ApiProperty()
  bucketConfigured!: boolean;

  @ApiProperty()
  credentialsConfigured!: boolean;

  @ApiProperty()
  prefixConfigured!: boolean;
}

export class StorageStatusDto {
  @ApiProperty({ enum: ['local', 'persistent-volume', 's3'] })
  mode!: 'local' | 'persistent-volume' | 's3';

  @ApiProperty({ enum: ['local', 's3'] })
  provider!: 'local' | 's3';

  @ApiProperty()
  configured!: boolean;

  @ApiProperty()
  persistentVolumeExpected!: boolean;

  @ApiProperty()
  rootConfigured!: boolean;

  @ApiProperty()
  localReady!: boolean;

  @ApiProperty()
  s3Configured!: boolean;

  @ApiProperty()
  storageRootConfigured!: boolean;

  @ApiProperty()
  metadataRootConfigured!: boolean;

  @ApiProperty()
  uploadDirectoryExists!: boolean;

  @ApiProperty()
  metadataDirectoryExists!: boolean;

  @ApiProperty()
  tempDirectoryExists!: boolean;

  @ApiProperty()
  urlMode!: 'proxy' | 'signed-url';

  @ApiProperty()
  maxFileSizeMb!: number;

  @ApiProperty()
  legacyRecords!: number;

  @ApiProperty()
  databaseConnected!: false;

  @ApiProperty({ type: S3SafeStatusDto })
  s3!: S3SafeStatusDto;

  @ApiProperty()
  message!: string;
}
