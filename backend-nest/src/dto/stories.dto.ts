import { IsBoolean } from 'class-validator';

export class ToggleFeaturedDto {
  @IsBoolean()
  featured: boolean;
}
