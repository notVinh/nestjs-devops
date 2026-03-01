import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber } from "class-validator";

export class CreateDepartmentDto {
    @ApiProperty({ description: 'Tên phòng ban' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ description: 'ID nhà máy' })
    @IsNumber()
    @IsNotEmpty()
    factoryId: number;

    @ApiProperty({ description: 'Mô tả phòng ban', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'Trạng thái phòng ban', default: 'active' })
    @IsString()
    @IsOptional()
    status?: string;
}
