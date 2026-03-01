import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class UpdateDepartmentDto {
    @ApiProperty({ description: 'Tên phòng ban' })
    @IsString()
    @IsNotEmpty()
    name: string;
}
