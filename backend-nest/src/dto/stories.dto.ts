import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class ToggleFeaturedDto {
  @IsBoolean()
  featured: boolean;
}

export class VoiceSwapDto {
  @IsString()
  character: string;

  @IsString()
  voiceId: string;
}