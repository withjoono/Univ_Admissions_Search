import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBooleanString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SearchQueryDto {
  @ApiPropertyOptional({ description: '키워드(대학/학과/전형/조건)' })
  @IsOptional() @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ['SUSI', 'JEONGSI'] })
  @IsOptional() @IsIn(['SUSI', 'JEONGSI'])
  trackType?: 'SUSI' | 'JEONGSI';

  @ApiPropertyOptional({ enum: ['Y2015', 'Y2022'], description: '교육과정' })
  @IsOptional() @IsIn(['Y2015', 'Y2022'])
  curriculum?: 'Y2015' | 'Y2022';

  @ApiPropertyOptional({ description: '지역' })
  @IsOptional() @IsString()
  region?: string;

  @ApiPropertyOptional({ description: '계열(대분류)' })
  @IsOptional() @IsString()
  field?: string;

  @ApiPropertyOptional({ description: '학년도' })
  @IsOptional() @Transform(({ value }) => parseInt(value, 10)) @IsInt()
  year?: number;

  @ApiPropertyOptional({ description: '면접 있는 전형만', example: 'false' })
  @IsOptional() @IsBooleanString()
  hasInterview?: string;

  @ApiPropertyOptional({ description: '계열 중분류' })
  @IsOptional() @IsString()
  fieldMid?: string;

  @ApiPropertyOptional({ enum: ['relevance', 'year', 'recruitment'], description: '정렬(기본: 키워드 있으면 relevance, 없으면 year)' })
  @IsOptional() @IsIn(['relevance', 'year', 'recruitment'])
  sort?: 'relevance' | 'year' | 'recruitment';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Transform(({ value }) => parseInt(value, 10)) @IsInt() @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Transform(({ value }) => parseInt(value, 10)) @IsInt() @Min(1) @Max(100)
  pageSize = 20;
}
