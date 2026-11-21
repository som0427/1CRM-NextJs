import Head from 'next/head'
import { useState, type ChangeEvent, useEffect, useRef } from 'react'
import { useSnackbar } from 'notistack'
import rcRegistrationService from '@/lib/services/rcRegistrationService'
import ChevronDown from '@/components/common/icons/ChevronDown'
import SearchableSelect from '@/components/common/SearchableSelect'
import {
  CITY_OPTIONS,
  TITLE_OPTIONS,
  PET_TYPE_OPTIONS,
  PET_BREEDS,
  PET_SIZE,
  STATE_OPTIONS,
  PINCODE_OPTIONS,
  HEAR_ABOUT_OPTIONS,
} from '@/lib/data/rcOptions'

export default function RcRegistration() {
  const { enqueueSnackbar } = useSnackbar()
  const [petType, setPetType] = useState<'Dog' | 'Cat' | ''>('')
  const [form, setForm] = useState({
    title: '',
    firstName: '',
    lastName: '',
    mobile: '',
    email: '',
    petName: '',
    petDob: '',
    breed: '',
    petSize: '',
    address1: '',
    address2: '',
    state: '',
    city: '',
    pincode: '',
    hearAbout: '',
    consentMarketing: false,
    consentResearch: false,
    petStageOption: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [timerSeconds, setTimerSeconds] = useState(120)
  const [attemptsLeft, setAttemptsLeft] = useState(3)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [saving, setSaving] = useState(false)
  const otpSectionRef = useRef<HTMLDivElement | null>(null)
  const lastEmailCheckedRef = useRef('')

  const checkMobileDuplicacy = async (mobile: string) => {
    if (mobile.length !== 10) return
    
    // Check for repeated digits first
    const firstDigit = mobile[0]
    const isRepeated = mobile.split('').every(digit => digit === firstDigit)
    if (isRepeated) {
      setErrors((prev) => ({ ...prev, mobile: 'Please enter a valid 10-digit mobile number' }))
      return
    }
    
    const { exists } = await rcRegistrationService.checkMobileDuplicacy(mobile)
    setErrors((prev) => ({ ...prev, mobile: exists ? 'Mobile number already exists' : '' }))
  }

  const handleResendOtp = async () => {
    if (timerSeconds > 0 || attemptsLeft <= 0) return
    setSendingOtp(true)
    const ok = await rcRegistrationService.sendOtp(form.mobile)
    if (ok) {
      setTimerSeconds(120)
      setAttemptsLeft(prev => prev - 1)
      setOtp('')
      setErrors((e) => ({ ...e, sendOtp: '', otp: '' }))
      setTimeout(() => {
        otpSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 0)
    } else {
      setErrors((e) => ({ ...e, sendOtp: 'Failed to send OTP. Please try again.' }))
    }
    setSendingOtp(false)
  }

  const checkEmailDuplicacy = async (email: string) => {
    // Only check after basic format is valid to reduce calls
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return
    const { exists } = await rcRegistrationService.checkEmailDuplicacy(email)
    setErrors((prev) => ({ ...prev, email: exists ? 'Email Id already exists' : '' }))
  }

  const onChange = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const valRaw = e.target.value
    const val = key === 'mobile' ? valRaw.replace(/\D/g, '').slice(0, 10) : valRaw
    setForm((prev) => {
      // Reset dependents when parent changes
      if (key === 'state') {
        return { ...prev, state: val, city: '', pincode: '' }
      }
      if (key === 'city') {
        return { ...prev, city: val, pincode: '' }
      }
      if (key === 'mobile') {
        return { ...prev, mobile: val }
      }
      if (key === 'breed') {
        const autoSize = PET_SIZE.find((s) => String(s.parentId) === String(val))?.id
        return { ...prev, breed: val, petSize: autoSize ? String(autoSize) : '' }
      }
      if (key === 'petDob') {
        // Reset pet selection and dependents when DOB changes
        setPetType('')
        return { ...prev, petDob: val, petStageOption: '', breed: '', petSize: '' }
      }
      return { ...prev, [key]: val }
    })
    setErrors((prev) => (key === 'breed' ? { ...prev, [key]: '', petSize: '' } : { ...prev, [key]: '' }))
    if (key === 'mobile') {
      void checkMobileDuplicacy(val)
    }
    // Email duplicacy will be checked onBlur to avoid multiple API calls while typing
  }

  const handleEmailBlur = () => {
    const email = form.email
    if (!email || email === lastEmailCheckedRef.current) return
    lastEmailCheckedRef.current = email
    void checkEmailDuplicacy(email)
  }

  const onCheckboxChange = (key: 'consentMarketing' | 'consentResearch') => (e: ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked
    setForm((prev) => ({ ...prev, [key]: checked }))
    setErrors((prev) => ({ ...prev, terms: '' }))
  }

  const validate = () => {
    const newErr: Record<string, string> = {}
    const nameRegex = /^[A-Za-z\s'-]{2,}$/
    const mobileRegex = /^\d{10}$/
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    // Check for repeated digits in mobile number
    const isRepeatedDigits = (mobile: string) => {
      if (mobile.length !== 10) return false
      const firstDigit = mobile[0]
      return mobile.split('').every(digit => digit === firstDigit)
    }

    if (!form.title) newErr.title = 'Please select a title'
    if (!nameRegex.test(form.firstName)) newErr.firstName = 'Please enter a valid name (letters only)'
    if (!nameRegex.test(form.lastName)) newErr.lastName = 'Please enter a valid name (letters only)'
    if (!mobileRegex.test(form.mobile) || isRepeatedDigits(form.mobile)) newErr.mobile = 'Please enter a valid 10-digit mobile number'
    else if (errors.mobile) newErr.mobile = errors.mobile
    if (!emailRegex.test(form.email)) newErr.email = 'Please enter a valid email address'
    else if (errors.email) newErr.email = errors.email
    if (!nameRegex.test(form.petName)) newErr.petName = 'Please enter a valid name (letters only)'
    if (!form.petDob) newErr.petDob = 'Please select a date of birth for your pet'
    if (!petType) newErr.petType = 'Please select a pet type'
    if (!form.breed) newErr.breed = 'Please select a breed'
    if (!form.petSize) newErr.petSize = 'Please select a pet size'
    if (!form.state) newErr.state = 'Please select a state'
    if (!form.city) newErr.city = 'Please select a city'
    if (!form.pincode) newErr.pincode = 'Please select a pincode'
    if (!(form.consentMarketing && form.consentResearch)) newErr.terms = 'Please select both the terms to proceed.'

    setErrors(newErr)
    return Object.keys(newErr).length === 0
  }

  const handleGetOtp = async () => {
    if (!validate()) return
    // Ensure mobile is valid and non-duplicate before sending
    if (errors.mobile) return
    setSendingOtp(true)
    const ok = await rcRegistrationService.sendOtp(form.mobile)
    if (ok) {
      setOtpSent(true)
      setTimerSeconds(120)
      setErrors((e) => ({ ...e, sendOtp: '' }))
      // Scroll to OTP input for visibility
      setTimeout(() => {
        otpSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 0)
    } else {
      setErrors((e) => ({ ...e, sendOtp: 'Failed to send OTP. Please try again.' }))
    }
    setSendingOtp(false)
  }

  const filteredCities = CITY_OPTIONS.filter((c) => String(c.parentId) === form.state)
  const filteredPincodes = PINCODE_OPTIONS.filter((p) => String(p.parentId) === form.city)
  // Map selected stage to species and corresponding breed parent ids
  // Get the parent ID for the currently selected pet stage
  const selectedStageId = PET_TYPE_OPTIONS.find((pt) => pt.label === form.petStageOption)?.id

  const isDogStage = form.petStageOption === 'Puppy' || form.petStageOption.includes('Dog')
  const isCatStage = form.petStageOption.includes('Cat') || form.petStageOption.includes('Kitten')

  const filteredBreeds = selectedStageId 
    ? PET_BREEDS.filter((b) => String(b.parentId) === String(selectedStageId))
    : []
  const filteredSizes = form.breed ? PET_SIZE.filter((s) => String(s.parentId) === String(form.breed)) : []

  const getAgeInYears = (dob: string) => {
    if (!dob) return null
    const birth = new Date(dob)
    if (isNaN(birth.getTime())) return null
    const today = new Date()
    let years = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) years--
    return years
  }
  const petAgeYears = getAgeInYears(form.petDob)
  const isAdult = typeof petAgeYears === 'number' && petAgeYears >= 1
  const ADULT_OPTIONS = ['Adult Dog', 'Adult Cat', 'Adult Cat Sterilised'] as const
  const YOUNG_OPTIONS = ['Puppy', 'Kitten', 'Kitten Sterilised'] as const

  // OTP countdown timer
  useEffect(() => {
    if (!otpSent || timerSeconds <= 0) return
    const id = setInterval(() => setTimerSeconds((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [otpSent, timerSeconds])

  // Auto scroll to OTP section when it appears
  useEffect(() => {
    if (otpSent) {
      otpSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [otpSent])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const handleVerifyOtp = async () => {
    if (otp.length !== 4) {
      setErrors((e) => ({ ...e, otp: 'Please enter the 4-digit OTP' }))
      return
    }
    setErrors((e) => ({ ...e, otp: '' }))
    const valid = await rcRegistrationService.validateOtp(otp, form.mobile)
    if (valid) {
      setSaving(true)
      const ok = await saveForm()
      setSaving(false)
      if (ok) {
        enqueueSnackbar('Your account has been registered successfully', { variant: 'success' })
        resetForm()
      }
    } else {
      setErrors((e) => ({ ...e, otp: 'Invalid OTP. Please try again.' }))
    }
  }
  const ALL_STAGE_OPTIONS = [...ADULT_OPTIONS, ...YOUNG_OPTIONS] as const
  const optionAllowed = (opt: (typeof ALL_STAGE_OPTIONS)[number]) => {
    if (!form.petDob) return false
    return isAdult ? ADULT_OPTIONS.includes(opt as any) : YOUNG_OPTIONS.includes(opt as any)
  }
  const optionToType = (opt: (typeof ALL_STAGE_OPTIONS)[number]): 'Dog' | 'Cat' =>
    opt.includes('Dog') || opt === 'Puppy' ? 'Dog' : 'Cat'

  const getLabelById = (arr: { id: string | number; label: string }[], idStr: string) => {
    const target = String(idStr)
    return arr.find((x) => String(x.id) === target)?.label || ''
  }

  const saveForm = async (): Promise<boolean> => {
    try {
      // IDs to send (dropdowns need IDs, not labels)
      const titleId = String(form.title)
      const breedId = String(form.breed)
      const sizeId = String(form.petSize)
      const stateId = String(form.state)
      const cityId = String(form.city)
      const pincodeId = String(form.pincode)
      const petTypeId = String(
        (PET_TYPE_OPTIONS.find((x) => x.label === form.petStageOption)?.id ?? '')
      )

      await rcRegistrationService.saveRegistration({
        title: titleId,
        firstName: form.firstName,
        lastName: form.lastName,
        mobile: form.mobile,
        email: form.email,
        petName: form.petName,
        petDob: form.petDob,
        myPetIs: petTypeId,
        petBreed: breedId,
        petSize: sizeId,
        address1: form.address1 || '',
        address2: form.address2 || '',
        state: stateId,
        city: cityId,
        pincode: pincodeId,
      })
      return true
    } catch (e) {
      console.error('Save failed', e)
      setErrors((er) => ({ ...er, save: 'Failed to save. Please try again.' }))
      return false
    }
  }

  const resetForm = () => {
    setForm({
      title: '',
      firstName: '',
      lastName: '',
      mobile: '',
      email: '',
      petName: '',
      petDob: '',
      breed: '',
      petSize: '',
      address1: '',
      address2: '',
      state: '',
      city: '',
      pincode: '',
      hearAbout: '',
      consentMarketing: false,
      consentResearch: false,
      petStageOption: '',
    })
    setOtp('')
    setOtpSent(false)
    setTimerSeconds(120)
    setAttemptsLeft(3)
    setErrors({})
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Registration | Royal Canin</title>
      </Head>

      <header className="w-full bg-white shadow-sm">
        <div className="w-full">
          <img
            src="/images/rc_header.jpg"
            alt="Royal Canin Pet Parent Community"
            className="block w-full h-auto"
          />
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4 md:p-6">
        <div className="rounded-2xl bg-white p-6 md:p-8 shadow-xl">
          <h1 className="mb-6 text-center text-2xl font-semibold text-gray-800 md:text-3xl">Registration Form</h1>

          <form className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <fieldset disabled={otpSent} className="contents">
            <div className="md:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Title <span className="text-[#F64E60]">*</span></label>
                <div className="relative">
                  <SearchableSelect
                    options={TITLE_OPTIONS}
                    value={form.title}
                    onChange={(v) => {
                      setForm((prev) => ({ ...prev, title: v }))
                      setErrors((e) => ({ ...e, title: '' }))
                    }}
                    placeholder="Select"
                  />
                </div>
                {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
              </div>

              <div className="flex flex-col gap-1 md:col-span-5">
                <label className="text-sm font-medium text-gray-700">First Name <span className="text-[#F64E60]">*</span></label>
                <input 
                  type="text" 
                  required 
                  className={`h-11 rounded-md border px-3 text-sm focus:border-blue-500 focus:outline-none ${errors.firstName ? 'border-red-500' : 'border-gray-300'}`} 
                  value={form.firstName} 
                  onChange={onChange('firstName')} />
                {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>}
              </div>

              <div className="flex flex-col gap-1 md:col-span-5">
                <label className="text-sm font-medium text-gray-700">Last Name <span className="text-[#F64E60]">*</span></label>
                <input 
                  type="text" 
                  required 
                  className={`h-11 rounded-md border px-3 text-sm focus:border-blue-500 focus:outline-none ${errors.lastName ? 'border-red-500' : 'border-gray-300'}`} 
                  value={form.lastName} 
                  onChange={onChange('lastName')} />
                {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Mobile Number <span className="text-[#F64E60]">*</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center justify-center rounded-l-md w-12 border border-gray-300 bg-gray-50">
                  <svg className="w-5 h-5" fill="#25D366" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.516"/>
                  </svg>
                </div>
                <input
                  type="tel"
                  required
                  inputMode="numeric"
                  maxLength={10}
                  pattern="^\\d{10}$"
                  autoComplete="off"
                  className={`w-full h-11 rounded-md border pl-14 pr-3 text-sm focus:border-blue-500 focus:outline-none ${errors.mobile ? 'border-red-500' : 'border-gray-300'}`}
                  value={form.mobile}
                  onChange={onChange('mobile')}
                  onKeyDown={(e) => {
                    const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Home','End']
                    if (allowed.includes(e.key)) return
                    if (!/\d/.test(e.key)) e.preventDefault()
                  }}
                />
              </div>
              <p className="text-xs text-gray-500">You'll receive your voucher/OTP on this WhatsApp number</p>
              {errors.mobile && <p className="mt-1 text-xs text-red-600">{errors.mobile}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Email ID <span className="text-[#F64E60]">*</span></label>
              <input 
                type="email" 
                required 
                autoComplete="off" 
                className={`h-11 rounded-md border px-3 text-sm focus:border-blue-500 focus:outline-none ${errors.email ? 'border-red-500' : 'border-gray-300'}`} 
                value={form.email} 
                onChange={onChange('email')} 
                onBlur={handleEmailBlur} />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Pet Name <span className="text-[#F64E60]">*</span></label>
              <input 
                type="text" 
                required 
                className={`h-11 rounded-md border px-3 text-sm focus:border-blue-500 focus:outline-none ${errors.petName ? 'border-red-500' : 'border-gray-300'}`} 
                value={form.petName} 
                onChange={onChange('petName')} />
              {errors.petName && <p className="mt-1 text-xs text-red-600">{errors.petName}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Pet Date of Birth <span className="text-[#F64E60]">*</span></label>
              <input
                type="date"
                required
                className={`h-11 cursor-pointer rounded-md border px-3 text-sm focus:border-blue-500 focus:outline-none ${errors.petDob ? 'border-red-500' : 'border-gray-300'}`}
                value={form.petDob}
                onChange={onChange('petDob')}
                onMouseDown={(e) => {
                  // Keep within a user gesture and avoid NotAllowedError
                  e.preventDefault()
                  const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void }
                  try { el.showPicker?.() } catch {}
                }}
              />
              {errors.petDob && <p className="mt-1 text-xs text-red-600">{errors.petDob}</p>}
            </div>

            <div className='md:col-span-2 bg-gray-100 rounded-lg'>
                <div className="md:col-span-2 p-4">
                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-gray-700">My pet is a <span className="text-[#F64E60]">*</span></span>
                        <div className={`flex flex-wrap items-center gap-12 text-sm text-gray-700 ${errors.petType ? 'ring-1 ring-red-400 rounded-md p-3 bg-red-50' : ''}`}>
                        {ALL_STAGE_OPTIONS.map((opt) => {
                          const enabled = optionAllowed(opt)
                          const baseType = optionToType(opt)
                          return (
                            <label key={opt} className={`inline-flex items-center gap-2 ${!enabled ? 'opacity-60' : ''}`}>
                              <input
                                type="radio"
                                name="petStage"
                                value={opt}
                                disabled={!enabled}
                                checked={form.petStageOption === opt}
                                onChange={() => {
                                  setForm((prev) => ({ ...prev, petStageOption: opt, breed: '', petSize: '' }))
                                  setPetType(baseType)
                                  setErrors((e)=>({ ...e, petType: '' }))
                                }}
                                className="h-4 w-4"
                              />
                              {opt}
                            </label>
                          )
                        })}
                        </div>
                        {errors.petType && <p className="mt-1 text-xs text-red-600">{errors.petType}</p>}
                    </div>
                </div>

                <div className="md:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2 p-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">Pet Breed <span className="text-[#F64E60]">*</span></label>
        					  <div className="relative">
                          <SearchableSelect
                            options={filteredBreeds}
                            value={form.breed}
                            disabled={!petType}
                            onChange={(v) => {
                              const autoSize = PET_SIZE.find((s) => String(s.parentId) === String(v))?.id
                              setForm((prev) => ({ ...prev, breed: v, petSize: autoSize ? String(autoSize) : '' }))
                              setErrors((e) => ({ ...e, breed: '', petSize: '' }))
                            }}
                            placeholder="Select Breed"
                          />
                        </div>
                        {errors.breed && <p className="mt-1 text-xs text-red-600">{errors.breed}</p>}
                    </div>

                    <div className="flex flex-col gap-1 hidden">
                        <label className="text-sm font-medium text-gray-700">Pet Size <span className="text-[#F64E60]">*</span></label>
                        <div className="relative">
                          <SearchableSelect
                            options={filteredSizes}
                            value={form.petSize}
                            disabled={!form.breed}
                            onChange={(v) => {
                              setForm((prev) => ({ ...prev, petSize: v }))
                              setErrors((e) => ({ ...e, petSize: '' }))
                            }}
                            placeholder="Select Size"
                          />
                        </div>
                        {errors.petSize && <p className="mt-1 text-xs text-red-600">{errors.petSize}</p>}
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Address Line 1</label>
              <input
                type="text"
                className="h-11 rounded-md border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none"
                value={form.address1}
                onChange={onChange('address1')}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Address Line 2</label>
              <input
                type="text"
                className="h-11 rounded-md border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none"
                value={form.address2}
                onChange={onChange('address2')}
              />
            </div>

            <div className="md:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-1 md:col-span-1">
                <label className="text-sm font-medium text-gray-700">State <span className="text-[#F64E60]">*</span></label>
                <div className="relative">
                  <SearchableSelect
                    options={STATE_OPTIONS}
                    value={form.state}
                    onChange={(v) => {
                      setForm((prev) => ({ ...prev, state: v, city: '', pincode: '' }))
                      setErrors((e) => ({ ...e, state: '', city: '', pincode: '' }))
                    }}
                    placeholder="Select State"
                  />
                </div>
                {errors.state && <p className="mt-1 text-xs text-red-600">{errors.state}</p>}
              </div>
              <div className="flex flex-col gap-1 md:col-span-1">
                <label className="text-sm font-medium text-gray-700">City <span className="text-[#F64E60]">*</span></label>
                <div className="relative">
                  <SearchableSelect
                    options={filteredCities}
                    value={form.city}
                    disabled={!form.state}
                    onChange={(v) => {
                      setForm((prev) => ({ ...prev, city: v, pincode: '' }))
                      setErrors((e) => ({ ...e, city: '', pincode: '' }))
                    }}
                    placeholder="Select City"
                  />
                </div>
                {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
              </div>
              <div className="flex flex-col gap-1 md:col-span-1">
                <label className="text-sm font-medium text-gray-700">Pincode <span className="text-[#F64E60]">*</span></label>
                <div className="relative">
                  <SearchableSelect
                    options={filteredPincodes}
                    value={form.pincode}
                    disabled={!form.city}
                    onChange={(v) => {
                      setForm((prev) => ({ ...prev, pincode: v }))
                      setErrors((e) => ({ ...e, pincode: '' }))
                    }}
                    placeholder="Select Pincode"
                  />
                </div>
                {errors.pincode && <p className="mt-1 text-xs text-red-600">{errors.pincode}</p>}
              </div>
            </div>

            <div className="md:col-span-2 rounded-lg bg-gray-100 p-4 text-sm text-gray-700">
              <p className="mb-3">See our <a className="text-red-600" href="https://www.mars.com/privacy">Privacy Statement</a> to find out how <a className="text-red-600" href="https://www.mars.com/our-brands/petcare">Mars Petcare brands</a> collect and use your data and for exercising your rights.</p>
              <p className="mb-3">If you are over 18 years old, please confirm by clicking the boxes to use of your personal data for the purposes below:</p>
              <label className="ml-6 mb-2 flex items-start gap-2">
                <input 
                  type="checkbox" 
                  className="mt-1 h-4 w-4" 
                  checked={form.consentMarketing} 
                  onChange={onCheckboxChange('consentMarketing')} />
                <span>To send you new product updates, special offers, and news from marketing communication.</span>
              </label>
              <label className="ml-6 flex items-start gap-2">
                <input 
                  type="checkbox" 
                  className="mt-1 h-4 w-4" 
                  checked={form.consentResearch} 
                  onChange={onCheckboxChange('consentResearch')} />
                <span>For research to enhance product and service offerings.</span>
              </label>
              <p className="mt-3 text-gray-600">You can change your preferences at any time by clicking "unsubscribe" on any of our Emails/WhatsApp.</p>
              {errors.terms && <p className="mt-2 text-sm text-red-600">{errors.terms}</p>}
            </div>

            <div className="md:col-span-2">
              <button type="button" onClick={handleGetOtp} disabled={otpSent || sendingOtp} className={`mx-auto flex h-11 items-center justify-center rounded-md px-8 font-medium text-white focus:outline-none ${(otpSent || sendingOtp) ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}>
                {sendingOtp ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    Sending OTP...
                  </span>
                ) : (
                  otpSent ? 'OTP Sent' : 'Send OTP'
                )}
              </button>
              <p className="mt-3 text-center text-sm text-gray-600">OTP will be sent on WhatsApp. Please ensure you enter a WhatsApp-enabled number.</p>
              {errors.sendOtp && <p className="mt-2 text-center text-sm text-red-600">{errors.sendOtp}</p>}
            </div>
            </fieldset>

            {otpSent && (
              <div ref={otpSectionRef} className="md:col-span-2 rounded-lg border border-gray-200 bg-white p-6">
                <div className="mx-auto max-w-md text-center">
                  <span className="block text-sm font-medium text-gray-700">Enter OTP sent to your WhatsApp number</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    className={`mt-3 h-12 w-40 mx-auto rounded-md border px-3 text-center text-lg tracking-widest focus:border-blue-500 focus:outline-none ${errors.otp ? 'border-red-500' : 'border-gray-300'}`}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  />
                  {errors.otp && (
                    <p className="mt-2 text-sm text-red-600">{errors.otp}</p>
                  )}
                  <div className="mt-3 text-sm text-gray-600">Time remaining: {formatTime(timerSeconds)}</div>
                  <div className="mt-4 flex items-center justify-center gap-4">
                    <button type="button" onClick={handleVerifyOtp} disabled={saving} className={`inline-flex h-10 items-center justify-center rounded-md px-6 font-medium text-white ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}>
                      {saving ? (
                        <span className="inline-flex items-center gap-2">
                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                          </svg>
                          Saving...
                        </span>
                      ) : (
                        'Verify OTP'
                      )}
                    </button>
                    {timerSeconds === 0 && attemptsLeft > 0 && (
                      <button type="button" onClick={handleResendOtp} disabled={sendingOtp} className={`inline-flex h-10 items-center justify-center rounded-md px-6 font-medium text-white ${sendingOtp ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-600 hover:bg-gray-700'}`}>
                        {sendingOtp ? (
                          <span className="inline-flex items-center gap-2">
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                            </svg>
                            Resending...
                          </span>
                        ) : (
                          'Resend OTP'
                        )}
                      </button>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    Attempts remaining: {attemptsLeft}
                    {attemptsLeft === 0 && <span className="text-red-600 ml-2">No more attempts available</span>}
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  )
}
