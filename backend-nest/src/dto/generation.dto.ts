import { IsString, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
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
  @IsOptional()
  @IsString()
  storyId?: string;

  @IsString()
  prompt: string;

  @IsOptional()
  @IsNumber()
  age?: number;

  @IsOptional()
  @IsString()
  systemPromptOverride?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CharacterRequestDto)
  characters?: CharacterRequestDto;

  @IsOptional()
  @IsString()
  mode?: 'prompt' | 'story';

  @IsOptional()
  @IsString()
  storyText?: string;
}

export class PreviewLineDto {
  @IsString()
  text: string;

  @IsString()
  voiceId: string;
}