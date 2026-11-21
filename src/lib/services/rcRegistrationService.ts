import { PET_TYPE_OPTIONS } from '@/lib/data/rcOptions'

export interface CheckDuplicacyResponse {
  statusCode: number
  message: string
  responseData: any[]
}

class RcRegistrationService {
  private DUPLICACY_URL =
    process.env.NEXT_PUBLIC_API_URL + '/transactions/api/loyalty/public/v1/checkDuplicacy?projectId=368'
  private SAVE_URL =
    (process.env.NEXT_PUBLIC_API_URL || '') +
    '/transactions/api/loyalty/public/v2/addEditCustomer?projectId=368&userId=11276'
  private OTP_URL =
    (process.env.NEXT_PUBLIC_API_URL || '') + '/setting/api/loyalty/public/generateOTP'
  private OTP_VALIDATE_URL =
    (process.env.NEXT_PUBLIC_API_URL || '') + '/setting/api/loyalty/public/validateOTP'

  /**
   * Checks if a mobile number already exists.
   * No Authorization header is required for this public endpoint.
   * @param mobile 10-digit mobile number
   * @returns true if exists, false otherwise
   */
  async checkMobileDuplicacy(mobile: string): Promise<{ exists: boolean; raw: CheckDuplicacyResponse | null }> {
    try {
      const body = {
        entityType: 2,
        andFilters: {
          '57103': [mobile],
        },
      }

      const res = await fetch(this.DUPLICACY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        throw new Error(`Duplicacy check failed: ${res.status}`)
      }
      const data = (await res.json()) as CheckDuplicacyResponse
      const exists = Array.isArray(data?.responseData) && data.responseData.length > 0
      return { exists, raw: data }
    } catch (e) {
      console.error('checkMobileDuplicacy failed', e)
      return { exists: false, raw: null }
    }
  }

  async checkEmailDuplicacy(email: string): Promise<{ exists: boolean; raw: CheckDuplicacyResponse | null }> {
    try {
      const body = {
        entityType: 2,
        andFilters: {
          '58645': [email],
        },
      }
      const res = await fetch(this.DUPLICACY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        throw new Error(`Duplicacy check failed: ${res.status}`)
      }
      const data = (await res.json()) as CheckDuplicacyResponse
      const exists = Array.isArray(data?.responseData) && data.responseData.length > 0
      return { exists, raw: data }
    } catch (e) {
      console.error('checkEmailDuplicacy failed', e)
      return { exists: false, raw: null }
    }
  }

  async sendOtp(mobile: string): Promise<boolean> {
    const body = {
      projectId: 368,
      mobileNumber: mobile,
      moduleType: 2,
      requestedBy: 11276,
    }
    const res = await fetch(this.OTP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return false
    return true
  }

  async validateOtp(otp: string, mobile: string): Promise<boolean> {
    const body = {
      projectId: 368,
      moduleType: 2,
      mobileNumber: mobile,
      oneTimePassword: Number(otp),
    }
    const res = await fetch(this.OTP_VALIDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return false
    try {
      const json = await res.json()
      return json?.statusCode === 200 && json?.responseData?.Valid === true
    } catch {
      return false
    }
  }

  /**
   * Data needed from the form to construct payload
   */
  public async saveRegistration(data: {
    title: string
    firstName: string
    lastName: string
    mobile: string
    email: string
    petName: string
    petDob: string // yyyy-mm-dd
    myPetIs: string // one of stage options (e.g., 'Adult Dog', 'Puppy', etc.)
    petBreed: string
    petSize: string
    address1: string
    address2?: string
    state: string
    city: string
    pincode: string
  }): Promise<any> {
    const adultDogId = PET_TYPE_OPTIONS.find((pt) => pt.label === 'Adult Dog')?.id
    const puppyId = PET_TYPE_OPTIONS.find((pt) => pt.label === 'Puppy')?.id
    const isDogFlow = [adultDogId, puppyId].some((id) => String(id) === String(data.myPetIs))
    const attr61393 = isDogFlow ? '159874' : '203036'

    const payload = {
      appVersion: null,
      deviceInfo: null,
      gps: null,
      isActive: 1,
      projectId: 368,
      customAttributeValues: [
        { attributeId: 57102, parentLinkedDatalistAttribId: null, value: [{ name: data.title }] },
        { attributeId: 55943, parentLinkedDatalistAttribId: null, value: [{ name: data.firstName }] },
        { attributeId: 57100, parentLinkedDatalistAttribId: null, value: [{ name: data.lastName }] },
        { attributeId: 57103, parentLinkedDatalistAttribId: null, value: [{ name: data.mobile }] },
        { attributeId: 58645, parentLinkedDatalistAttribId: null, value: [{ name: data.email }] },
        { attributeId: 57109, parentLinkedDatalistAttribId: null, value: [{ name: data.petName }] },
        { attributeId: 57110, parentLinkedDatalistAttribId: null, value: [{ name: data.petDob }] },
        { attributeId: 58648, parentLinkedDatalistAttribId: null, value: [{ name: data.myPetIs }] },
        { attributeId: 57528, parentLinkedDatalistAttribId: 58648, value: [{ name: data.petBreed }] },
        { attributeId: 57527, parentLinkedDatalistAttribId: 58648, value: [{ name: data.petSize }] },
        { attributeId: 61393, parentLinkedDatalistAttribId: 58648, value: [{ name: attr61393 }] },
        { attributeId: 55945, parentLinkedDatalistAttribId: null, value: [{ name: data.address1 }] },
        { attributeId: 57101, parentLinkedDatalistAttribId: null, value: [{ name: data.address2 || '' }] },
        { attributeId: 55948, parentLinkedDatalistAttribId: null, value: [{ name: '11276' }] },
        { attributeId: 55949, parentLinkedDatalistAttribId: null, value: [{ name: '156507' }] },
        { attributeId: 57108, parentLinkedDatalistAttribId: null, value: [{ name: data.state }] },
        { attributeId: 57106, parentLinkedDatalistAttribId: 57108, value: [{ name: data.city }] },
        { attributeId: 57107, parentLinkedDatalistAttribId: 57108, value: [{ name: data.pincode }] },
        { attributeId: 60311, parentLinkedDatalistAttribId: null, value: [{ name: 'Online Retailer' }] },
        { attributeId: 60310, parentLinkedDatalistAttribId: null, value: [{ name: '421967' }] },
        { attributeId: 57114, parentLinkedDatalistAttribId: null, value: [{ name: 'null' }] },
        { attributeId: 55944, parentLinkedDatalistAttribId: null, value: [{ name: '156523' }] },
        { attributeId: 65149, parentLinkedDatalistAttribId: null, value: [{ name: 'Online Retailer' }] },
        { attributeId: 57118, parentLinkedDatalistAttribId: null, value: [{ name: '157184,159871' }] },
      ],
      transTimeZone: 'IST',
    }

    const res = await fetch(this.SAVE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': '2e1b3c4d5f6g00116' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Save failed: ${res.status} ${res.statusText} - ${text}`)
    }
    const json = await res.json()
    return json
  }
}

export const rcRegistrationService = new RcRegistrationService()
export default rcRegistrationService

