import { IsString, IsOptional } from 'class-validator';

export class ReserveDto {
  @IsOptional()
  @IsString()
  heroName?: string;

  @IsOptional()
  @IsString()
  heroAge?: string;

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsString()
  requesterName?: string;

  @IsOptional()
  @IsString()
  requesterSource?: string;

  @IsOptional()
  @IsString()
  requesterContact?: string;
}
