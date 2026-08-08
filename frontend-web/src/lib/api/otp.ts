import { api } from './client'
import type { OtpSendResponse, OtpVerifyResponse } from './types'

export const otpApi = {
  send: (phone: string) =>
    api.post<OtpSendResponse>('/otp/send', { phone }).then((r) => r.data),

  verify: (code: string) =>
    api.post<OtpVerifyResponse>('/otp/verify', { code }).then((r) => r.data),
}
