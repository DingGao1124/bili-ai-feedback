import { IsString, IsNotEmpty } from 'class-validator';
import type { AnalyzeRequest } from '../types';

export class AnalyzeDto implements AnalyzeRequest {
  @IsString()
  @IsNotEmpty()
  input!: string;
}
