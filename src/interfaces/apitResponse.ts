/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ApiResponse<T = any> {
  status: number;
  data: T;
}

export interface RepositoryResponse<T = any> {
  status: number;
  data: T | string;
}
