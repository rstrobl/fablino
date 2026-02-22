import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SideCharacterDto {
  @IsString()
  name: string;

  @IsString()
  role: string;
}

export class HeroDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  age?: string;
}

export class CharacterRequestDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => HeroDto)
  hero?: HeroDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SideCharacterDto)
  sideCharacters?: SideCharacterDto[];
}

export class GenerateStoryDto {
  @IsString()
  prompt: string;

  @IsOptional()
  @IsString()
  ageGroup?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CharacterRequestDto)
  characters?: CharacterRequestDto;
}

export class PreviewLineDto {
  @IsString()
  text: string;

  @IsString()
  voiceId: string;

  @IsOptional()
  voiceSettings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };

  @IsOptional()
  @IsString()
  previous_text?: string;

  @IsOptional()
  @IsString()
  next_text?: string;
}