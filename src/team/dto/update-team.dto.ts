import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateTeamDto {
    @ApiProperty({ description: 'Tên tổ' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ description: 'Mô tả tổ', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'Trạng thái tổ', required: false })
    @IsString()
    @IsOptional()
    status?: string;
}
