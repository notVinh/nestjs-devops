export type TMessage = Record<string, string>;
export type BaseResponse<T> = {
  statusCode: number;
  message?: string | TMessage;
  data?: T;
};

export class ResponseHelper {
  static success<T>(data: T, message: string | TMessage = '', statusCode: number): BaseResponse<T> {
    return {
      statusCode,
      message,
      data,
    };
  }

  static successNoData(message: string | TMessage = '', statusCode: number): BaseResponse<null> {
    return {
      statusCode,
      message,
      data: null,
    };
  }

  static error(message: string | TMessage, statusCode: number) {
    return {
      statusCode,
      message,
    };
  }
}
