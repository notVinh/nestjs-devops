import Handlebars from 'handlebars';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nContext } from 'nestjs-i18n';
import { MailData } from './interfaces/mail-data.interface';
import { AllConfigType } from 'src/config/config.type';
import { MaybeType } from '../utils/types/maybe.type';
import { MailerService } from 'src/mailer/mailer.service';
import * as puppeteer from 'puppeteer';
import fs from 'node:fs/promises';

import path from 'path';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService<AllConfigType>
  ) {
    // Đăng ký Helper để tính Thành tiền: {{multiply quantity unitPrice}}
    Handlebars.registerHelper('multiply', (a, b) => {
      const res = Number(a) * Number(b);
      return res ? res.toLocaleString() : '0';
    });

    // Đăng ký Helper để làm STT: {{addOne @index}}
    Handlebars.registerHelper('addOne', index => Number(index) + 1);

    // Helper định dạng số: {{formatNumber 1000000}} -> 1.000.000
    Handlebars.registerHelper('formatNumber', num => {
      return num ? Number(num).toLocaleString() : '0';
    });
  }

  async userSignUp(mailData: MailData<{ hash: string }>): Promise<void> {
    const i18n = I18nContext.current();
    let emailConfirmTitle: MaybeType<string>;
    let text1: MaybeType<string>;
    let text2: MaybeType<string>;
    let text3: MaybeType<string>;

    if (i18n) {
      [emailConfirmTitle, text1, text2, text3] = await Promise.all([
        i18n.t('common.confirmEmail'),
        i18n.t('confirm-email.text1'),
        i18n.t('confirm-email.text2'),
        i18n.t('confirm-email.text3'),
      ]);
    }

    await this.mailerService.sendMail({
      to: mailData.to,
      subject: emailConfirmTitle,
      text: `${this.configService.get('app.frontendDomain', {
        infer: true,
      })}/confirm-email/${mailData.data.hash} ${emailConfirmTitle}`,
      templatePath: path.join(
        this.configService.getOrThrow('app.workingDirectory', {
          infer: true,
        }),
        'src',
        'mail',
        'mail-templates',
        'activation.hbs'
      ),
      context: {
        title: emailConfirmTitle,
        url: `${this.configService.get('app.frontendDomain', {
          infer: true,
        })}/confirm-email/${mailData.data.hash}`,
        actionTitle: emailConfirmTitle,
        app_name: this.configService.get('app.name', { infer: true }),
        text1,
        text2,
        text3,
      },
    });
  }

  async forgotPassword(
    mailData: MailData<{ otp: string; expiresIn: number }>
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: mailData.to,
      subject: 'Mã OTP xác thực',
      text: `Mã OTP của bạn là: ${mailData.data.otp}. Mã này có hiệu lực trong ${mailData.data.expiresIn} phút.`,
      templatePath: path.join(
        this.configService.getOrThrow('app.workingDirectory', {
          infer: true,
        }),
        'src',
        'mail',
        'mail-templates',
        'reset-password.hbs'
      ),
      context: {
        title: 'Mã OTP xác thực',
        otp: mailData.data.otp,
        expiresIn: mailData.data.expiresIn,
        app_name: this.configService.get('app.name', {
          infer: true,
        }),
      },
    });
  }

  async sendOtp(
    mailData: MailData<{ otp: string; expiresIn: number }>
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: mailData.to,
      subject: 'Mã OTP xác thực',
      text: `Mã OTP của bạn là: ${mailData.data.otp}. Mã này có hiệu lực trong ${mailData.data.expiresIn} phút.`,
      templatePath: path.join(
        this.configService.getOrThrow('app.workingDirectory', {
          infer: true,
        }),
        'src',
        'mail',
        'mail-templates',
        'reset-password.hbs'
      ),
      context: {
        title: 'Mã OTP xác thực',
        otp: mailData.data.otp,
        expiresIn: mailData.data.expiresIn,
        app_name: this.configService.get('app.name', {
          infer: true,
        }),
        text1: 'Bạn đã yêu cầu mã OTP để xác thực tài khoản.',
        text2: 'Sử dụng mã OTP bên dưới để hoàn tất quá trình xác thực.',
        text3: 'Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.',
        text4: 'Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi.',
      },
    });
  }

  async sendNewPassword(
    mailData: MailData<{ newPassword: string }>
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: mailData.to,
      subject: 'Mật khẩu mới của bạn',
      text: `Mật khẩu mới của bạn là: ${mailData.data.newPassword}. Vui lòng đăng nhập và đổi mật khẩu ngay.`,
      templatePath: path.join(
        this.configService.getOrThrow('app.workingDirectory', {
          infer: true,
        }),
        'src',
        'mail',
        'mail-templates',
        'new-password.hbs'
      ),
      context: {
        title: 'Mật khẩu mới của bạn',
        newPassword: mailData.data.newPassword,
        app_name: this.configService.get('app.name', {
          infer: true,
        }),
        loginUrl: this.configService.get('app.frontendDomain', {
          infer: true,
        }),
      },
    });
  }

  async sendQuotation(to: string, quotationData: any): Promise<void> {
    console.log(quotationData);
    // 1. Compile Template thành HTML bằng MailerService (tái sử dụng logic của bạn)
    const templatePath = path.join(
      this.configService.getOrThrow('app.workingDirectory', { infer: true }),
      'src',
      'mail',
      'mail-templates',
      'quotation.hbs'
    );

    const items = quotationData.items || [];

    const template = await fs.readFile(templatePath, 'utf-8');
    const compiledTemplate = Handlebars.compile(template);
    const htmlContent = compiledTemplate({
      ...quotationData,
      day: new Date().getDate(),
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      items: items,
    });

    // 2. Sử dụng Puppeteer để chuyển HTML thành PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process', // Rất quan trọng để tránh crash process trên Linux
        '--no-zygote',
        '--disable-gpu',
      ],
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    });
    await browser.close();

    // 3. Sử dụng MailerService của bạn để gửi mail đính kèm file PDF
    await this.mailerService.sendMail({
      to: to,
      subject: `[GTG] Báo giá thiết bị - ${quotationData.customerName}`,
      text: `Kính gửi quý khách báo giá từ Giang Thành GTG. Chi tiết vui lòng xem file đính kèm. Nếu quý khách hàng thấy báo giá hợp lý, vui lòng xác nhận qua đường link sau: ${process.env.LANDING_DOMAIN}/customer/order/${quotationData.confirmationToken}. Cảm ơn quý khách đã quan tâm đến sản phẩm của chúng tôi.`,
      attachments: [
        {
          filename: `Bao_Gia_GTG_${Date.now()}.pdf`,
          content: pdfBuffer,
        },
      ],
    });
  }
}
