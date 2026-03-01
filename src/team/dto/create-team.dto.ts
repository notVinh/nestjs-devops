import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber } from "class-validator";

export class CreateTeamDto {
    @ApiProperty({ description: 'Tên tổ' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ description: 'ID phòng ban' })
    @IsNumber()
    @IsNotEmpty()
    departmentId: number;

    @ApiProperty({ description: 'ID nhà máy' })
    @IsNumber()
    @IsNotEmpty()
    factoryId: number;

    @ApiProperty({ description: 'Mô tả tổ', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'Trạng thái tổ', default: 'active' })
    @IsString()
    @IsOptional()
    status?: string;
}
