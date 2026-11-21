export interface ProductFormData {
  id: number;
  productFormId?: number;
  serialNo?: string;
  owner?: string;
  status?: string;
  [key: string]: any;
}

export interface ProductFormDisplayOrderPayload {
  id: number;
  name: string;
  displayOrder: number;
}

export interface ProductFormApiResponse {
  responseData: {
    data: ProductFormData[];
    totalCount?: number;
    totalCountForAdvSearch?: number;
  };
  statusCode: number;
  message?: string;
}
