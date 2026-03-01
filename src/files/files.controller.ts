import {
  Controller,
  Get,
  Param,
  Post,
  Response,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FilesService } from './files.service';

@ApiTags('Files')
@Controller({
  path: 'files',
  version: '1',
})
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File | Express.MulterS3.File
  ) {
    const uploadedFile = await this.filesService.uploadFile(file);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Upload file thành công',
      data: uploadedFile,
    };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('upload-multiple')
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  async uploadMultipleFiles(
    @UploadedFiles() files: Array<Express.Multer.File | Express.MulterS3.File>
  ) {
    if (!files || files.length === 0) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không có file nào được upload',
        data: [],
      };
    }

    const uploadedFiles = await this.filesService.uploadMultipleFiles(files);
    return {
      statusCode: HttpStatus.CREATED,
      message: `Upload ${uploadedFiles.length} file thành công`,
      data: uploadedFiles,
    };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('upload-employee-avatar/:employeeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload avatar cho nhân viên' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadEmployeeAvatar(
    @Param('employeeId') employeeId: number,
    @UploadedFile() file: Express.Multer.File | Express.MulterS3.File
  ) {
    const employee = await this.filesService.uploadEmployeeAvatar(
      employeeId,
      file
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Upload avatar thành công',
      data: employee,
    };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('upload-product-file')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload ảnh dành riêng cho sản phẩm' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadProductImage(
    @UploadedFile() file: Express.Multer.File | Express.MulterS3.File
  ) {
    // Chúng ta gọi service và truyền thêm tham số 'product' để phân loại folder
    const uploadedFile = await this.filesService.uploadFileProduct(
      file,
      'product'
    );
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Upload ảnh sản phẩm thành công',
      data: uploadedFile,
    };
  }

  @Get(':path')
  download(@Param('path') path, @Response() response) {
    return response.sendFile(path, { root: './files' });
  }
}
