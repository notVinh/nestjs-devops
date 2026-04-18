import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { FilesModule } from './files/files.module';
import { AuthModule } from './auth/auth.module';
import databaseConfig from './config/database.config';
import authConfig from './config/auth.config';
import appConfig from './config/app.config';
import mailConfig from './config/mail.config';
import fileConfig from './config/file.config';
import googleConfig from './config/google.config';
import imapConfig from './config/imap.config';
import path from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthGoogleModule } from './auth-google/auth-google.module';
import { I18nModule } from 'nestjs-i18n/dist/i18n.module';
import { HeaderResolver } from 'nestjs-i18n';
import { TypeOrmConfigService } from './database/typeorm-config.service';
import { ForgotModule } from './forgot/forgot.module';
import { MailModule } from './mail/mail.module';
import { HomeModule } from './home/home.module';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AllConfigType } from './config/config.type';
import { SessionModule } from './session/session.module';
import { MailerModule } from './mailer/mailer.module';
import { FactoryModule } from './factory/factory.module';
import { EmployeeModule } from './employee/employee.module';
import { AttendanceModule } from './attendance/attendance.module';
import { DeparmentsModule } from './deparments/deparments.module';
import { PositionEmployeeModule } from './position-employee/position-employee.module';
import { LeaveRequestModule } from './leave-request/leave-request.module';
import { LeaveTypeModule } from './leave-type/leave-type.module';
import { OvertimeModule } from './overtime/overtime.module';
import { OvertimeCoefficientModule } from './overtime-coefficient/overtime-coefficient.module';
import { BulkOvertimeRequestModule } from './bulk-overtime-request/bulk-overtime-request.module';
import { DailyProducionModule } from './daily-producion/daily-producion.module';
import { HolidayModule } from './holiday/holiday.module';
import { TimeModule } from './time/time.module';
import { EmployeeFeedbackModule } from './employee-feedback/employee-feedback.module';
import { ArrivalReportModule } from './arrival-report/arrival-report.module';
import { OvernightReportModule } from './overnight-report/overnight-report.module';
import { MaintenanceReportModule } from './maintenance-report/maintenance-report.module';
import { NotificationModule } from './notification/notification.module';
import { MisaOrderModule } from './misa-order/misa-order.module';
import { PurchaseOrderModule } from './purchase-order/purchase-order.module';
import { PurchaseRequisitionModule } from './purchase-requisition/purchase-requisition.module';
import { LoggerModule } from './logger/logger.module';
import { TeamModule } from './team/team.module';
import { SupportTypeModule } from './support-type/support-type.module';
import { SupportRequestModule } from './support-request/support-request.module';
import { RoleGroupModule } from './role-group/role-group.module';
import { MisaTokenModule } from './misa-token/misa-token.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { QuotationModule } from './quotation/quotation.module';
import { GeneralRequestModule } from './general-request/general-request.module';
import { CustomerModule } from './customer/customer.module';
import { CustomerCareModule } from './customer-care/customer-care.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    LoggerModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        databaseConfig,
        authConfig,
        appConfig,
        mailConfig,
        fileConfig,
        googleConfig,
        imapConfig,
      ],
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
      dataSourceFactory: async (options: DataSourceOptions) => {
        return new DataSource(options).initialize();
      },
    }),
    I18nModule.forRootAsync({
      useFactory: (configService: ConfigService<AllConfigType>) => ({
        fallbackLanguage: configService.getOrThrow('app.fallbackLanguage', {
          infer: true,
        }),
        loaderOptions: { path: path.join(__dirname, '/i18n/'), watch: true },
      }),
      resolvers: [
        {
          use: HeaderResolver,
          useFactory: (configService: ConfigService<AllConfigType>) => {
            return [
              configService.get('app.headerLanguage', {
                infer: true,
              }),
            ];
          },
          inject: [ConfigService],
        },
      ],
      imports: [ConfigModule],
      inject: [ConfigService],
    }),
    UsersModule,
    FilesModule,
    AuthModule,
    AuthGoogleModule,
    ForgotModule,
    SessionModule,
    MailModule,
    MailerModule,
    HomeModule,
    FactoryModule,
    EmployeeModule,
    AttendanceModule,
    DeparmentsModule,
    PositionEmployeeModule,
    LeaveRequestModule,
    LeaveTypeModule,
    OvertimeModule,
    OvertimeCoefficientModule,
    BulkOvertimeRequestModule,
    DailyProducionModule,
    HolidayModule,
    TimeModule,
    EmployeeFeedbackModule,
    ArrivalReportModule,
    MaintenanceReportModule,
    NotificationModule,
    MisaOrderModule,
    PurchaseOrderModule,
    PurchaseRequisitionModule,
    TeamModule,
    SupportTypeModule,
    SupportRequestModule,
    RoleGroupModule,
    MisaTokenModule,
    CategoriesModule,
    ProductsModule,
    QuotationModule,
    GeneralRequestModule,
    CustomerModule,
    CustomerCareModule,
  ],
})
export class AppModule {}
