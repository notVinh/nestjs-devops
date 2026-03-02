import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import puppeteer, { Page } from 'puppeteer';
import axios from 'axios';
import * as imapSimple from 'imap-simple';
import { simpleParser } from 'mailparser';
import { EventEmitter } from 'events';
import {
  MisaToken,
  MisaLogEntry,
  MisaTokenSource,
} from './entities/misa-token.entity';
import { truncateSync } from 'fs';

@Injectable()
export class MisaTokenService implements OnModuleInit {
  private readonly logger = new Logger(MisaTokenService.name);

  // Cache token in memory for quick access
  private cachedToken: string | null = null;
  private cachedTokenExpiry: Date | null = null;

  // EventEmitter for streaming logs to SSE clients
  private readonly logEmitter = new EventEmitter();
  private currentRecord: MisaToken | null = null;
  private isRefreshing = false;

  constructor(
    @InjectRepository(MisaToken)
    private readonly misaTokenRepository: Repository<MisaToken>
  ) {
    this.logEmitter.setMaxListeners(100);
  }

  // Subscribe to log events for SSE
  onLog(callback: (log: MisaLogEntry & { recordId: number }) => void) {
    this.logEmitter.on('log', callback);
    return () => this.logEmitter.off('log', callback);
  }

  // Get refreshing status
  getRefreshingStatus() {
    return {
      isRefreshing: this.isRefreshing,
      currentRecordId: this.currentRecord?.id || null,
    };
  }

  // Emit log to SSE clients and save to database
  private async emitLog(type: MisaLogEntry['type'], message: string) {
    const logEntry: MisaLogEntry = {
      type,
      message,
      timestamp: new Date().toISOString(),
    };

    // Log to console
    if (type === 'error') {
      this.logger.error(message);
    } else if (type === 'warning') {
      this.logger.warn(message);
    } else {
      this.logger.log(message);
    }

    // Emit to SSE clients
    if (this.currentRecord) {
      this.logEmitter.emit('log', {
        ...logEntry,
        recordId: this.currentRecord.id,
      });

      // Save to database
      this.currentRecord.logs = [...(this.currentRecord.logs || []), logEntry];
      await this.misaTokenRepository.save(this.currentRecord);
    }
  }

  async onModuleInit() {
    // Load existing token from database on startup
    if (process.env.MISA_USERNAME && process.env.MISA_PASSWORD) {
      this.logger.log('MISA credentials found, loading token from database...');
      await this.loadTokenFromDatabase();
    } else {
      this.logger.warn('MISA credentials not found in environment variables');
    }
  }

  /**
   * Load token from database and cache it in memory
   * Kiểm tra token còn hợp lệ dựa vào thời gian tạo (token MISA valid ~23h)
   */
  private async loadTokenFromDatabase(): Promise<void> {
    try {
      // Lấy token thành công mới nhất
      const tokenEntity = await this.misaTokenRepository.findOne({
        where: {
          deletedAt: IsNull(),
          status: 'success',
        },
        order: { createdAt: 'DESC' },
      });

      if (tokenEntity && tokenEntity.accessToken && tokenEntity.completedAt) {
        // Tính thời gian hết hạn: completedAt + 23 giờ
        const tokenAge =
          Date.now() - new Date(tokenEntity.completedAt).getTime();
        const maxAge = 23 * 60 * 60 * 1000; // 23 giờ

        if (tokenAge < maxAge) {
          try {
            this.cachedToken = tokenEntity.getAccessTokenDecrypted();
            // Set expiry = completedAt + 23h
            this.cachedTokenExpiry = new Date(
              new Date(tokenEntity.completedAt).getTime() + maxAge
            );
            this.logger.log(
              `Loaded MISA token from database (expires in ${Math.round(
                (maxAge - tokenAge) / 60000
              )} minutes)`
            );
          } catch (error: any) {
            this.logger.error(
              'Failed to decrypt MISA token from database:',
              error.message
            );
            this.cachedToken = null;
            this.cachedTokenExpiry = null;
          }
        } else {
          this.logger.log('MISA token in database has expired');
          this.cachedToken = null;
          this.cachedTokenExpiry = null;
        }
      } else {
        this.logger.log('No valid MISA token found in database');
        this.cachedToken = null;
        this.cachedTokenExpiry = null;
      }
    } catch (error) {
      this.logger.error('Failed to load token from database', error);
      this.cachedToken = null;
      this.cachedTokenExpiry = null;
    }
  }

  // Chạy lúc 3:00 sáng mỗi ngày (giờ Việt Nam)
  @Cron('0 0 3 * * *', {
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async scheduledRefreshToken() {
    if (!process.env.MISA_USERNAME || !process.env.MISA_PASSWORD) {
      this.logger.warn('Scheduled refresh skipped: MISA credentials not found');
      return;
    }

    const maxRetries = 5;
    const retryDelayMs = 5 * 60 * 1000; // 5 phút giữa các lần retry

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(
          `Starting scheduled MISA token refresh (attempt ${attempt}/${maxRetries})...`
        );
        await this.refreshToken('scheduled');
        this.logger.log('Scheduled token refresh succeeded');
        return;
      } catch (error: any) {
        this.logger.error(
          `Scheduled token refresh failed (attempt ${attempt}/${maxRetries}): ${error.message}`
        );
        if (attempt < maxRetries) {
          this.logger.log(`Retrying in ${retryDelayMs / 60000} minutes...`);
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        } else {
          this.logger.error('Scheduled token refresh failed after all retries');
        }
      }
    }
  }

  async refreshToken(source: MisaTokenSource = 'manual'): Promise<string> {
    if (this.isRefreshing) {
      throw new Error('Token refresh is already in progress');
    }

    this.isRefreshing = true;

    // Tạo record mới để lưu lịch sử
    this.currentRecord = this.misaTokenRepository.create({
      status: 'running',
      source,
      startedAt: new Date(),
      logs: [],
    });
    await this.misaTokenRepository.save(this.currentRecord);

    try {
      await this.emitLog('info', 'Bắt đầu làm mới token MISA...');

      const newToken = await this.autoLogin();

      // Cập nhật record với token thành công
      this.currentRecord.accessToken = newToken;
      this.currentRecord.status = 'success';
      this.currentRecord.completedAt = new Date();
      await this.misaTokenRepository.save(this.currentRecord);

      // Update cache
      this.cachedToken = newToken;
      this.cachedTokenExpiry = new Date(Date.now() + 23 * 60 * 60 * 1000);

      await this.emitLog('success', 'Làm mới token MISA thành công!');

      return newToken;
    } catch (error: any) {
      // Cập nhật record với lỗi
      if (this.currentRecord) {
        this.currentRecord.status = 'failed';
        this.currentRecord.completedAt = new Date();
        this.currentRecord.errorMessage = error.message || 'Unknown error';
        await this.misaTokenRepository.save(this.currentRecord);
        await this.emitLog('error', `Lỗi: ${error.message}`);
      }
      throw error;
    } finally {
      this.isRefreshing = false;
      this.currentRecord = null;
    }
  }

  /**
   * Get history of token refreshes
   */
  async getHistory(
    page = 1,
    limit = 20
  ): Promise<{ data: MisaToken[]; total: number }> {
    const [data, total] = await this.misaTokenRepository.findAndCount({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      select: [
        'id',
        'status',
        'startedAt',
        'completedAt',
        'errorMessage',
        'source',
        'logs',
        'createdAt',
      ],
    });
    return { data, total };
  }

  /**
   * Get a specific record by ID
   */
  async getRecordById(id: number): Promise<MisaToken | null> {
    return this.misaTokenRepository.findOne({
      where: { id, deletedAt: IsNull() },
      select: [
        'id',
        'status',
        'startedAt',
        'completedAt',
        'errorMessage',
        'source',
        'logs',
        'createdAt',
      ],
    });
  }

  async autoLogin(): Promise<string> {
    await this.emitLog('info', 'Khởi động trình duyệt...');

    const browser = await puppeteer.launch({
      headless: false,
      protocolTimeout: 120000, // Tăng timeout lên 2 phút để tránh lỗi Runtime.callFunctionOn timed out
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    let amisSessionToken: string | null = null;

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });

      // === Step 1: Vào trang login MISA ID ===
      await this.emitLog('info', 'Đang truy cập trang đăng nhập MISA...');
      await page.goto(`${process.env.MISA_URL_AMISAPP}/login`, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // === Step 2: Điền thông tin đăng nhập ===
      await this.emitLog('info', 'Đang điền thông tin đăng nhập...');

      // Sử dụng retry logic để xử lý trường hợp page load chậm
      await this.waitForSelectorWithRetry(
        page,
        'input[type="text"], input[name="username"], input[id="username"]',
        { timeout: 15000, retries: 3 }
      );

      // Điền username
      const usernameSelector = await this.findSelector(page, [
        'input[name="username"]',
        'input[id="username"]',
        'input[type="text"]',
        'input[placeholder*="mail"]',
        'input[placeholder*="user"]',
      ]);
      await page.type(usernameSelector, process.env.MISA_USERNAME || '');

      // Điền password
      const passwordSelector = await this.findSelector(page, [
        'input[name="password"]',
        'input[id="password"]',
        'input[type="password"]',
      ]);
      await page.type(passwordSelector, process.env.MISA_PASSWORD || '');

      // Click nút login
      const loginButtonSelector = await this.findSelector(page, [
        'button[objname="jBtnLogin"]',
        'button.login-form-btn',
        'button[res-key="FormLogin_LoginButton"]',
        'button[type="submit"]',
      ]);
      await page.click(loginButtonSelector);
      await this.emitLog('info', 'Đã gửi thông tin đăng nhập');

      // === Step 3: Đợi navigation và xử lý 2FA ===
      await this.emitLog('info', 'Đang chờ phản hồi từ server...');
      try {
        await page.waitForNavigation({
          waitUntil: 'networkidle0',
          timeout: 30000,
        });
      } catch (e) {
        await this.emitLog('warning', 'Không có navigation sau khi đăng nhập');
      }

      // === Kiểm tra và xử lý trường hợp tài khoản đang đăng nhập ở thiết bị khác ===
      await this.emitLog(
        'info',
        'Kiểm tra popup "đã đăng nhập ở thiết bị khác"...'
      );
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Tìm nút "Tiếp tục đăng nhập"
      let continueLoginClicked = false;
      const continueLoginSelectors = [
        'button.ms-button-primary',
        'button.ms-button',
        '.ms-button-primary',
      ];

      for (const selector of continueLoginSelectors) {
        const buttons = await page.$$(selector);
        for (const btn of buttons) {
          const text = await btn.evaluate(el => el.textContent || '');
          if (text.includes('Tiếp tục đăng nhập')) {
            await this.emitLog(
              'warning',
              'Phát hiện tài khoản đang đăng nhập ở thiết bị khác'
            );
            await btn.click();
            continueLoginClicked = true;
            await this.emitLog('info', 'Đã click "Tiếp tục đăng nhập"');
            break;
          }
        }
        if (continueLoginClicked) break;
      }

      // Nếu không tìm thấy bằng selector, tìm theo text trong .ms-button-text
      if (!continueLoginClicked) {
        const allButtonTexts = await page.$$('.ms-button-text');
        for (const btnText of allButtonTexts) {
          const text = await btnText.evaluate(el => el.textContent || '');
          if (text.includes('Tiếp tục đăng nhập')) {
            await this.emitLog(
              'warning',
              'Phát hiện tài khoản đang đăng nhập ở thiết bị khác'
            );
            await btnText.evaluate(el => {
              const btn = el.closest('button');
              if (btn) btn.click();
            });
            continueLoginClicked = true;
            await this.emitLog('info', 'Đã click "Tiếp tục đăng nhập"');
            break;
          }
        }
      }

      // Nếu đã click, đợi navigation
      if (continueLoginClicked) {
        try {
          await page.waitForNavigation({
            waitUntil: 'networkidle0',
            timeout: 30000,
          });
          await this.emitLog(
            'info',
            'Navigation sau tiếp tục đăng nhập hoàn tất'
          );
        } catch (e) {
          await this.emitLog(
            'warning',
            'Không có navigation sau tiếp tục đăng nhập'
          );
        }
      }

      // Kiểm tra và xử lý 2FA nếu có
      const otpInputSelector = await this.findOptionalSelector(page, [
        'input[objname="jOTP"]',
        'input[name="otp"]',
        'input[placeholder="Mã xác nhận"]',
      ]);

      if (otpInputSelector) {
        await this.emitLog(
          'info',
          'Phát hiện yêu cầu 2FA, đang lấy OTP từ email...'
        );
        const otp = await this.getOtpFromEmail();

        if (otp) {
          await page.type(otpInputSelector, otp);
          await this.emitLog('success', 'Đã nhập OTP');

          // Đợi một chút để page xử lý OTP
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Click nút Tiếp tục
          await this.emitLog('info', 'Đang tìm nút xác nhận OTP...');
          const confirmBtnSelector = await this.findOptionalSelector(page, [
            'div[objname="jBtnNext"]',
            '.login-form-message-button-blue[mode="otp"]',
            'button[type="submit"]',
            '.ms-button-primary',
          ]);

          if (confirmBtnSelector) {
            await this.emitLog('info', 'Đang click nút xác nhận...');
            try {
              await page.click(confirmBtnSelector);
            } catch (clickError: any) {
              await this.emitLog(
                'warning',
                `Lỗi click nút: ${clickError.message}, thử dùng evaluate...`
              );
              // Fallback: dùng JavaScript để click
              await page.evaluate(selector => {
                const el = document.querySelector(selector);
                if (el) (el as HTMLElement).click();
              }, confirmBtnSelector);
            }
          } else {
            await this.emitLog(
              'warning',
              'Không tìm thấy nút xác nhận, đợi tự động chuyển trang...'
            );
          }

          // Đợi navigation hoặc thay đổi URL
          await this.emitLog('info', 'Đang chờ xử lý OTP...');
          try {
            await page.waitForNavigation({
              waitUntil: 'networkidle0',
              timeout: 60000, // Tăng timeout lên 60s
            });
            await this.emitLog('info', 'Navigation sau OTP hoàn tất');
          } catch (e) {
            await this.emitLog(
              'warning',
              'Không có navigation sau 2FA, tiếp tục...'
            );
            // Đợi thêm một chút để đảm bảo page đã xử lý xong
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        } else {
          throw new Error('Không thể lấy OTP từ email');
        }
      }

      // === BƯỚC 4: THOÁT KHỎI TRANG PROFILE / ĐỔI MẬT KHẨU ===
      // Nếu bị kẹt ở Profile, ta ép nó về trang ID - nơi "đẻ" ra token chính
      await this.emitLog(
        'info',
        'Đang ép điều hướng về id.misa.vn để lấy token...'
      );
      await page.goto('https://id.misa.vn/', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Chờ 5s để trang ID load xong session
      await new Promise(resolve => setTimeout(resolve, 5000));

      // === BƯỚC 5: LẤY TOKEN TỪ LOCALSTORAGE (THỬ NHIỀU KEY) ===
      amisSessionToken = await page.evaluate(() => {
        // Thử tất cả các key có thể chứa token mà bạn nhìn thấy
        return (
          localStorage.getItem('misaid_token') ||
          localStorage.getItem('access_token') ||
          localStorage.getItem('token') ||
          sessionStorage.getItem('access_token')
        );
      });

      // === BƯỚC 6: NẾU VẪN KHÔNG CÓ, THỬ VÀO TRANG ACTAPP ===
      if (!amisSessionToken) {
        await this.emitLog(
          'warning',
          'Chưa thấy token ở ID, thử sang App Kế toán...'
        );
        await page.goto('https://actapp.misa.vn/app', {
          waitUntil: 'networkidle2',
        });
        await new Promise(resolve => setTimeout(resolve, 8000));

        amisSessionToken = await page.evaluate(() => {
          return (
            localStorage.getItem('smeToken') || localStorage.getItem('token')
          );
        });
      }

      if (amisSessionToken) {
        await this.emitLog('success', 'Đã lấy được Token!');
      } else {
        throw new Error('Không thể tìm thấy token ở bất kỳ trang nào.');
      }

      await browser.close();
      return amisSessionToken;
    } catch (error: any) {
      if (browser) await browser.close();
      throw error;
    }
  }
  // Đọc OTP từ email MISA
  private async getOtpFromEmail(
    maxRetries = 10,
    retryDelay = 3000
  ): Promise<string | null> {
    const config = {
      imap: {
        user: process.env.IMAP_USER || '',
        password: process.env.IMAP_PASSWORD || '',
        host: process.env.IMAP_HOST || 'imap.gmail.com',
        port: parseInt(process.env.IMAP_PORT || '993'),
        tls: process.env.IMAP_TLS !== 'false',
        authTimeout: 10000,
        tlsOptions: { rejectUnauthorized: false },
      },
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const connection = await imapSimple.connect(config);
        await connection.openBox('INBOX');

        const delay = 5 * 60 * 1000; // 5 phút
        const since = new Date(Date.now() - delay);

        const searchCriteria = [
          'UNSEEN',
          ['SINCE', since],
          ['FROM', 'no-reply@misa.vn'],
        ];

        const fetchOptions = {
          bodies: [''],
          markSeen: false,
        };

        const messages = await connection.search(searchCriteria, fetchOptions);

        for (const message of messages.reverse()) {
          const all = message.parts.find(part => part.which === '');
          if (all) {
            const parsed = await simpleParser(all.body);
            const subject = parsed.subject || '';

            const otpMatch = subject.match(/^(\d{6})\s+là\s+mã\s+xác\s+nhận/i);
            if (otpMatch) {
              const otp = otpMatch[1];
              await connection.addFlags(message.attributes.uid, ['\\Seen']);
              await connection.end();
              return otp;
            }
          }
        }

        await connection.end();

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      } catch (error: any) {
        this.logger.error('IMAP error: ' + error.message);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    return null;
  }

  // Tìm selector tùy chọn (không throw error)
  private async findOptionalSelector(
    page: Page,
    selectors: string[]
  ): Promise<string | null> {
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          return selector;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    return null;
  }

  // Helper: Tìm selector đầu tiên tồn tại
  private async findSelector(page: Page, selectors: string[]): Promise<string> {
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          return selector;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    throw new Error(`None of the selectors found: ${selectors.join(', ')}`);
  }

  // Helper: Wait for selector với retry logic
  private async waitForSelectorWithRetry(
    page: Page,
    selector: string,
    options: { timeout?: number; retries?: number } = {}
  ): Promise<void> {
    const timeout = options.timeout || 15000;
    const maxRetries = options.retries || 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await page.waitForSelector(selector, { timeout });
        return;
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        await this.emitLog(
          'warning',
          `Không tìm thấy selector (lần ${attempt}/${maxRetries}), đang thử lại...`
        );
        // Reload page và thử lại
        try {
          await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
        } catch (reloadError) {
          await this.emitLog('warning', 'Reload page timeout, tiếp tục thử...');
        }
        // Đợi thêm một chút sau khi reload
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  // Gọi API logoff để đăng xuất session trên MISA
  private async callLogoffApi(token: string): Promise<void> {
    this.logger.log('Calling logoff API...');

    try {
      const response = await axios.post(
        `${process.env.MISA_URL_AMISAPP}/g2/api/auth/v1/Account/logoff`,
        {},
        {
          headers: {
            Accept: 'application/json, text/plain, */*',
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json;charset=UTF-8',
            Origin: `${process.env.MISA_URL_AMISAPP}`,
            Referer: `${process.env.MISA_URL_ACTAPP}/app/Overview/dashboard`,
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      );

      this.logger.log('Logoff successful: ' + response.status);
    } catch (error: any) {
      this.logger.warn(
        'Logoff failed: ' + (error.response?.status || error.message)
      );
    }
  }

  /**
   * Validate token bằng cách gọi 1 API đơn giản của MISA
   * @returns true nếu token còn hợp lệ, false nếu hết hạn hoặc lỗi
   */
  private async validateTokenWithApi(token: string): Promise<boolean> {
    try {
      // Gọi API lấy thông tin user - nếu token hợp lệ sẽ trả về data
      const response = await axios.get(
        `${process.env.MISA_URL_ACTAPP}/g2/api/sync/v1/pa/check_connect`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          timeout: 10000,
        }
      );

      // Nếu response.data.Success === true thì token hợp lệ
      return response.data?.Success === true;
    } catch (error: any) {
      // 401/403 = token hết hạn, các lỗi khác = network issue
      if (error.response?.status === 401 || error.response?.status === 403) {
        this.logger.log('Token validation failed: Token expired or invalid');
        return false;
      }
      // Nếu lỗi network, coi như token vẫn valid để không block user
      this.logger.warn(
        'Token validation failed due to network error, assuming valid'
      );
      return true;
    }
  }

  /**
   * Clear token cache - dùng khi gặp lỗi authentication
   */
  clearTokenCache(): void {
    this.logger.log('Clearing token cache...');
    this.cachedToken = null;
    this.cachedTokenExpiry = null;
  }

  // Public methods để sử dụng token
  async getToken(): Promise<string> {
    // Check cache first - nếu có token trong memory và chưa hết hạn
    if (
      this.cachedToken &&
      this.cachedTokenExpiry &&
      this.cachedTokenExpiry > new Date()
    ) {
      return this.cachedToken;
    }

    // Try to load from database
    await this.loadTokenFromDatabase();

    // Nếu có token từ DB, validate nó
    if (this.cachedToken) {
      this.logger.log('Validating token from database...');
      const isValid = await this.validateTokenWithApi(this.cachedToken);

      if (isValid) {
        this.logger.log('Token from database is valid');
        return this.cachedToken;
      } else {
        // Token không hợp lệ, clear cache
        this.logger.log('Token from database is invalid, need to refresh');
        this.cachedToken = null;
        this.cachedTokenExpiry = null;
      }
    }

    // Không có token hợp lệ - KHÔNG tự động refresh, để user quyết định
    // Vì refresh token mất thời gian và cần hiển thị loading cho user
    return '';
  }

  /**
   * Get token from database without validation (for debugging)
   * Dùng khi cần lấy token raw để debug
   */
  async getTokenRaw(): Promise<string> {
    await this.loadTokenFromDatabase();
    return this.cachedToken || '';
  }

  /**
   * Get token with option to auto-refresh if needed
   * Dùng khi cần đảm bảo có token, sẽ tự động refresh nếu cần
   */
  async getTokenOrRefresh(): Promise<string> {
    const token = await this.getToken();
    if (token) {
      return token;
    }

    // Không có token hợp lệ, cần refresh
    this.logger.log('No valid token, starting refresh...');
    return this.refreshToken();
  }

  getTokenSync(): string | null {
    return this.cachedToken;
  }

  isTokenValid(): boolean {
    return (
      !!this.cachedToken &&
      !!this.cachedTokenExpiry &&
      this.cachedTokenExpiry > new Date()
    );
  }

  /**
   * Get token info (without decrypted token) for monitoring
   */
  async getTokenInfo(): Promise<{
    hasToken: boolean;
    isValid: boolean;
    expiresAt: Date | null;
    expiresIn: number | null; // minutes remaining
    lastRefreshed: Date | null;
  }> {
    // First check cache
    if (this.cachedToken && this.cachedTokenExpiry) {
      const now = new Date();
      const isValid = this.cachedTokenExpiry > now;
      const expiresIn = isValid
        ? Math.round((this.cachedTokenExpiry.getTime() - now.getTime()) / 60000)
        : 0;

      return {
        hasToken: true,
        isValid,
        expiresAt: this.cachedTokenExpiry,
        expiresIn,
        lastRefreshed: new Date(
          this.cachedTokenExpiry.getTime() - 23 * 60 * 60 * 1000
        ),
      };
    }

    // Check database
    const tokenEntity = await this.misaTokenRepository.findOne({
      where: {
        deletedAt: IsNull(),
        status: 'success',
      },
      order: { createdAt: 'DESC' },
    });

    if (!tokenEntity || !tokenEntity.completedAt) {
      return {
        hasToken: false,
        isValid: false,
        expiresAt: null,
        expiresIn: null,
        lastRefreshed: null,
      };
    }

    const maxAge = 23 * 60 * 60 * 1000;
    const expiresAt = new Date(
      new Date(tokenEntity.completedAt).getTime() + maxAge
    );
    const now = new Date();
    const isValid = expiresAt > now;
    const expiresIn = isValid
      ? Math.round((expiresAt.getTime() - now.getTime()) / 60000)
      : 0;

    return {
      hasToken: true,
      isValid,
      expiresAt,
      expiresIn,
      lastRefreshed: tokenEntity.completedAt,
    };
  }
}
