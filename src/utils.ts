import axios from "axios"

import { CJS_2_TESTIT_STATUS_MAP, CJS_2_TESTIT_STEP_STATUS_MAP } from "./constants"

const NBSP_CHAR_CODE = 160
export const indent = (num: number): string => ''.padStart(num, String.fromCharCode(NBSP_CHAR_CODE))

export const parseError = (e: unknown) =>
    axios.isAxiosError(e) 
        ? e.response?.data 
        : e instanceof Error
            ? e.toString()
            : 'Unknown error'

export const cjs2testItStatus = (status?: string) => {
    if (status)
        return CJS_2_TESTIT_STATUS_MAP[status]
    return undefined
}

export const cjs2testItStepStatus = (status?: string) => {
    if (status)
        return CJS_2_TESTIT_STEP_STATUS_MAP[status]
    return undefined
}
