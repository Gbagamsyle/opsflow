import { IsEnum, IsInt, Min } from 'class-validator';
import { TaskStatus } from '../../generated/enums';

export class MoveTaskDto {
  @IsEnum(TaskStatus)
  status!: TaskStatus;

  @IsInt()
  @Min(0)
  position!: number;
}
