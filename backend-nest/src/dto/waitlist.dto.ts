import { IsString, IsOptional, IsEmail, IsArray } from 'class-validator';

export class CreateWaitlistDto {
  @IsEmail()
  email: string;

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
  sideCharacters?: any[];

  @IsOptional()
  @IsString()
  storyId?: string;
}