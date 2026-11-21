export interface GeneralResponse<T> {
    statusCode: number;
    message: string;
    responseData: T;
} 