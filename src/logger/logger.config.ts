import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import * as path from 'path';
import DailyRotateFile = require('winston-daily-rotate-file');

// Custom format để log dễ đọc hơn
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, context, stack }) => {
    const contextStr = context ? `[${context}]` : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `${timestamp} ${level.toUpperCase().padEnd(7)} ${contextStr} ${message}${stackStr}`;
  }),
);

// Console format với màu sắc
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, context }) => {
    const contextStr = context ? `[${context}]` : '';
    return `${timestamp} ${level} ${contextStr} ${message}`;
  }),
);

export const winstonConfig: WinstonModuleOptions = {
  transports: [
    // Console transport - hiển thị trên terminal
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    }),

    // File transport cho tất cả logs (combined.log)
    new DailyRotateFile({
      dirname: path.join(process.cwd(), 'logs'),
      filename: 'combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: customFormat,
      level: 'info',
    }),

    // File transport riêng cho email listener
    new DailyRotateFile({
      dirname: path.join(process.cwd(), 'logs'),
      filename: 'email-listener-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: winston.format.combine(
        winston.format((info) => {
          // Chỉ log từ EmailListenerService
          return info.context === 'EmailListenerService' ? info : false;
        })(),
        customFormat,
      ),
      level: 'debug',
    }),

    // File transport cho errors
    new DailyRotateFile({
      dirname: path.join(process.cwd(), 'logs'),
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: customFormat,
      level: 'error',
    }),
  ],
};
