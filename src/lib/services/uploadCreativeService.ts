import apiClient from './apiClient';

/**
 * Upload Creative endpoints can be pointed at a service running outside the shared
 * gateway (see NEXT_PUBLIC_UPLOAD_CREATIVE_API_URL in environment/env.local.js).
 * Blank in every deployed environment, so those fall back to the gateway.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_UPLOAD_CREATIVE_API_URL || process.env.NEXT_PUBLIC_API_URL;

/**
 * A creative configures exactly one section — either a carousel or a banner,
 * never both. `creativeType` is the discriminator.
 */
export enum CreativeTypeEnum {
  CAROUSEL = 1,
  BANNER = 2,
}

/**
 * Resolve a creative's type. Records created before `creativeType` existed do not
 * carry one, so fall back to whichever section actually holds data. Legacy records
 * that have both resolve to Carousel and are normalised on their next save.
 */
export const resolveCreativeType = (record: {
  creativeType?: number | null;
  carouselItems?: unknown[] | null;
  bannerItems?: unknown[] | null;
}): CreativeTypeEnum => {
  // Coerce: JSON may deliver this as a string, which would silently fall through
  // to the legacy derivation below and mis-detect banner records.
  const declared = record.creativeType == null ? NaN : Number(record.creativeType);
  if (declared === CreativeTypeEnum.CAROUSEL || declared === CreativeTypeEnum.BANNER) {
    return declared;
  }
  const hasCarousel = (record.carouselItems?.length ?? 0) > 0;
  const hasBanner = (record.bannerItems?.length ?? 0) > 0;
  if (hasBanner && !hasCarousel) return CreativeTypeEnum.BANNER;
  return CreativeTypeEnum.CAROUSEL;
};

export interface UploadCreativeItem {
  id: number;
  visibleTo: string;
  visibleToType: number;
  visibleToId: number | null;
  createdBy: number;
  createdByName: string;
  createdOn: string;
  status: number;
  /** Optional until the backend ships the field; grid falls back to "-". */
  creativeType?: number | null;
}

export interface UploadCreativeListResponse {
  statusCode: number;
  message: string;
  responseData: UploadCreativeItem[];
}

export interface CustomAttributeFilterPayload {
  fieldId: string;
  /**
   * Set when `fieldId` is a data-list child attribute, holding the entity's DATA_LIST
   * attribute id — the same pairing the entity stores its child values under. null for
   * an ordinary attribute and for the DATA_LIST field itself, which is the shape every
   * filter saved before child filtering existed already has.
   */
  parentDataListId: number | null;
  fieldValue: string[];
}

/**
 * CreativeItemDTO — one row of the creative's single section. Carousel and banner
 * rows share this shape; `url` is the carousel's click-through link and is blank
 * for banner rows, which have no link.
 */
export interface CreativeItemPayload {
  id: number | null;
  displayOrder: number;
  fileUrl: string;
  url: string;
}

export interface SaveUploadCreativePayload {
  id?: number | null;
  /** CreativeTypeEnum — the section this creative configures. */
  creativeType: number;
  visibleTo: number;
  selectedRole: number | null;
  status: number;
  visibilityBehaviour: number;
  /**
   * Visibility window, "YYYY-MM-DD HH:mm:ss" (24-hour) in project-local time. Either
   * end may be null: null start means visible immediately, null end means visible
   * indefinitely.
   */
  startDateTime: string | null;
  endDateTime: string | null;
  customAttributeFilters: CustomAttributeFilterPayload[];
  /** Rows of the selected section only — creativeType says which section they are. */
  items: CreativeItemPayload[];
}

export interface SaveUploadCreativeResponse {
  statusCode: number;
  message: string;
  responseData: any;
}

export interface UploadCreativeDetail {
  id: number;
  /** Optional until the backend ships the field; use resolveCreativeType(). */
  creativeType?: number | null;
  visibleTo: number;
  selectedRole: number | null;
  status: number;
  visibilityBehaviour: number;
  /** Visibility window, "YYYY-MM-DD HH:mm:ss"; null/absent means unbounded on that end. */
  startDateTime?: string | null;
  endDateTime?: string | null;
  customAttributeFilters: {
    id?: number;
    fieldId: string;
    /** Absent on filters saved before data-list child filtering existed. */
    parentDataListId?: number | null;
    fieldValue: string[];
  }[];
  /**
   * Unified rows matching CreativeItemDTO. The save payload settled on `items`;
   * `creativeItems` is accepted too so a rename on the response side does not
   * silently blank the form.
   */
  items?: CreativeItemResponse[] | null;
  creativeItems?: CreativeItemResponse[] | null;
  /** Legacy split arrays, still read so records saved before the merge open correctly. */
  carouselItems?: {
    id?: number;
    displayOrder: number;
    imageUrl: string;
    url: string;
  }[] | null;
  bannerItems?: {
    id?: number;
    displayOrder: number;
    fileUrl: string;
  }[] | null;
}

/**
 * One row as the detail endpoint returns it. `fileUrl` is the CreativeItemDTO field,
 * but carousel rows have historically used `imageUrl`, so both are read.
 */
export interface CreativeItemResponse {
  id?: number;
  displayOrder?: number;
  fileUrl?: string;
  imageUrl?: string;
  url?: string;
}

export interface GetUploadCreativeByIdResponse {
  statusCode: number;
  message: string | null;
  responseData: UploadCreativeDetail | null;
}

class UploadCreativeService {
  async getUploadCreativeList(projectId: number, signal?: AbortSignal): Promise<UploadCreativeListResponse> {
    try {
      return apiClient.get(
        `${API_BASE_URL}/setting/api/uploadCreative/getUploadCreativeList`,
        { projectId },
        { signal }
      );
    } catch (error) {
      console.error('Error fetching upload creative list:', error);
      throw error;
    }
  }

  async saveUploadCreative(projectId: number, payload: SaveUploadCreativePayload): Promise<SaveUploadCreativeResponse> {
    try {
      return apiClient.post(
        `${API_BASE_URL}/setting/api/uploadCreative/saveUploadCreative`,
        payload,
        { params: { projectId } }
      );
    } catch (error) {
      console.error('Error saving upload creative:', error);
      throw error;
    }
  }

  async getUploadCreativeById(id: number): Promise<GetUploadCreativeByIdResponse> {
    try {
      return apiClient.get(
        `${API_BASE_URL}/setting/api/uploadCreative/getUploadCreativeById`,
        { id }
      );
    } catch (error) {
      console.error('Error fetching upload creative by id:', error);
      throw error;
    }
  }
}

const uploadCreativeService = new UploadCreativeService();
export default uploadCreativeService;
