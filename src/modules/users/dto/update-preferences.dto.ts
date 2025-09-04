import { IsOptional, IsString, IsArray, IsIn } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsIn(['formal', 'casual', 'technical'], { message: 'Communication style must be formal, casual, or technical' })
  communicationStyle?: 'formal' | 'casual' | 'technical';

  @IsOptional()
  @IsArray({ message: 'Industry focus must be an array' })
  @IsString({ each: true, message: 'Each industry must be a string' })
  industryFocus?: string[];

  @IsOptional()
  @IsArray({ message: 'Experience levels must be an array' })
  @IsString({ each: true, message: 'Each experience level must be a string' })
  experienceLevels?: string[];

  @IsOptional()
  defaultSearchFilters?: any;
}