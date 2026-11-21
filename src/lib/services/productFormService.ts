import { ProductFormApiResponse, ProductFormDisplayOrderPayload } from '../models/productFormModels';
import apiClient from '../api/apiClient';
import { UserLocalizationService } from './userLocalizationService';

const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const PRODUCT_FORM_SETTINGS_URL = `${baseUrl}/setting/api/productForm/getSettings`;
const PRODUCT_FORM_SEQUENCE_URL = `${baseUrl}/setting/api/productForm/sequenceProductForms`;
const PRODUCT_FORM_DELETE_URL = `${baseUrl}/setting/api/productForm/deleteProductForm`;
const PRODUCT_FORM_ADD_UPDATE_URL = `${baseUrl}/setting/api/productForm/addUpdateSetting`;
const PRODUCT_FORM_FIELDS_URL = `${baseUrl}/transactions/api/customType/getFields`;
const PRODUCT_FORM_FIELDS_SEQUENCE_URL = `${baseUrl}/setting/api/customType/sequenceFields`;
const PRODUCT_FORM_GET_SETTING_URL = `${baseUrl}/setting/api/productForm/getSetting`;
const GET_ALL_ATTRIBUTE_TYPES_URL = `${baseUrl}/setting/api/customType/getAllAttributeTypes`;
const CALCULATED_FIELD_VALIDATE_URL = `${baseUrl}/setting/api/calculatedField/validate`;

class ProductFormService {
  async getProductFormsFilter(
    projectId: number,
    _view: number,
    _pageNumber: number,
    _pageSize: number,
    _includeDeleted = false,
    _advanceSearchRequest?: any
  ): Promise<ProductFormApiResponse> {
    const endpoint = `${PRODUCT_FORM_SETTINGS_URL}?projectId=${projectId}`;
    const payload = await apiClient.get<{
      statusCode: number;
      message?: string;
      responseData?: any[];
    }>(endpoint);

    const records = Array.isArray(payload?.responseData)
      ? payload.responseData
      : [];

    return {
      statusCode: payload?.statusCode ?? 200,
      responseData: {
        data: records,
        totalCount: records.length,
        totalCountForAdvSearch: records.length
      },
      message: payload?.message
    };
  }

  async exportProductForms(
    _projectId: number,
    _view: number,
    _requestBody: any
  ): Promise<{ statusCode: number; responseData: string }> {
    return Promise.resolve({
      statusCode: 200,
      responseData: 'Export triggered'
    });
  }

  async updateDisplayOrder(
    projectId: number,
    payload: ProductFormDisplayOrderPayload[]
  ): Promise<{ statusCode: number; message: string }> {
    const response = await apiClient.post<
      { statusCode: number; message: string }
    >(
      `${PRODUCT_FORM_SEQUENCE_URL}?projectId=${projectId}`,
      payload
    );

    return {
      statusCode: response?.statusCode ?? 200,
      message: response?.message ?? 'Display order updated'
    };
  }

  async addUpdateProductForm(payload: {
    name: string;
    serialKey: string;
    projectId: number;
    productFormView: number;
    summaryFieldsForApp: number[];
    summaryTotalField: number;
    allowDiscounts: number;
    discountType: number[];
    allowDiscountAt: number[];
    isActive: number;
    displayOrder: number;
    userTime?: string;
    transTimeZone?: string;
  }): Promise<{
    statusCode: number;
    message?: string;
    responseData?: { id?: number; message?: string };
  }> {
    const requestBody = {
      ...payload,
      userTime: payload.userTime || UserLocalizationService.getUserTime(),
      transTimeZone: payload.transTimeZone || UserLocalizationService.getUserTimeZoneCode()
    };

    const response = await apiClient.post<{
      statusCode: number;
      message?: string;
      responseData?: { id?: number; message?: string };
    }>(
      PRODUCT_FORM_ADD_UPDATE_URL,
      requestBody
    );

    return {
      statusCode: response?.statusCode ?? 500,
      message:
        response?.message ||
        response?.responseData?.message ||
        'Product form saved successfully.',
      responseData: response?.responseData
    };
  }

  async deleteProductForm(
    projectId: number,
    productFormId: number
  ): Promise<{
    statusCode: number;
    message: string;
    responseData?: { productFormId?: number; message?: string };
  }> {
    const response = await apiClient.delete<{
      statusCode: number;
      message?: string;
      responseData?: { productFormId?: number; message?: string };
    }>(
      `${PRODUCT_FORM_DELETE_URL}?projectId=${projectId}&productFormId=${productFormId}`
    );

    return {
      statusCode: response?.statusCode ?? 500,
      message:
        response?.message ||
        response?.responseData?.message ||
        'Product form deleted successfully.',
      responseData: response?.responseData
    };
  }

  async getProductFormFields(
    projectId: number,
    moduleType:string
  ): Promise<{ statusCode: number; message?: string; responseData?: any }>
  {
    return apiClient.get(
      `${PRODUCT_FORM_FIELDS_URL}?projectId=${projectId}&moduleType=${moduleType}`
    );
  }

  async sequenceFields(
    payload: Array<{ id: number; attributeName: string; displayOrder: number }>
  ): Promise<{ statusCode: number; message?: string; responseData?: any }> {
    return apiClient.post(PRODUCT_FORM_FIELDS_SEQUENCE_URL, payload);
  }

  async getProductFormSetting(
    productFormId: number
  ): Promise<{ statusCode: number; message?: string; responseData?: any }> {
    return apiClient.get(`${PRODUCT_FORM_GET_SETTING_URL}/${productFormId}`);
  }

  async saveProductFormSetting(payload: {
    id?: number;
    name: string;
    serialKey: string;
    projectId: number;
    productFormView: number;
    summaryFieldsForApp: number[];
    summaryTotalField: number | null;
    allowDiscounts: number;
    discountType?: number[];
    isActive: number;
    displayOrder?: number;
  }): Promise<{ statusCode: number; message?: string; responseData?: any }> {
    const requestBody = {
      ...payload,
      userTime: UserLocalizationService.getUserTime(),
      transTimeZone: UserLocalizationService.getUserTimeZoneCode()
    };
    return apiClient.post(PRODUCT_FORM_ADD_UPDATE_URL, requestBody);
  }

  async getAllAttributeTypes(
    moduleType: number = 200
  ): Promise<{ statusCode: number; message?: string; responseData?: any }> {
    return apiClient.get(`${GET_ALL_ATTRIBUTE_TYPES_URL}?moduleType=${moduleType}`);
  }

  async getNumericFieldsForCalculation(
    projectId: number,
    moduleType: string
  ): Promise<{ statusCode: number; message?: string; responseData?: Array<{ attributeId: number; attributeName: string }> }> {
    // Get all fields and filter for numeric type (type 7)
    const response = await this.getProductFormFields(projectId, moduleType);
    if (response.statusCode === 200 && response.responseData) {
      const fields = Array.isArray(response.responseData) 
        ? response.responseData 
        : (response.responseData?.data || []);
      
      const numericFields = fields
        .filter((f: any) => {
          const typeId = f?.attributeType?.id ?? f?.attributeTypeId;
          return typeId === 7; // Numeric field type
        })
        .map((f: any) => ({
          attributeId: f?.attributeId ?? f?.id,
          attributeName: f?.attributeName ?? f?.combinedAttributeName ?? ''
        }));
      
      return { statusCode: 200, responseData: numericFields };
    }
    return { statusCode: response.statusCode, message: response.message, responseData: [] };
  }

  validateCalculatedField(
    payload: {
      expression: string;
      attributeList: Array<{
        attributeId: number;
        attributeName: string;
        combinedAttributeName: string;
        value: string;
      }>;
    },
    signal?: AbortSignal
  ): Promise<{ responseData: any; statusCode: number; message: string }> {
    return apiClient.post(CALCULATED_FIELD_VALIDATE_URL, payload, { signal });
  }
}

const productFormService = new ProductFormService();
export default productFormService;
