import axios from "axios"
import { output } from "codeceptjs"

import { CJS_2_TESTIT_STATUS_MAP, CJS_2_TESTIT_STEP_STATUS_MAP, PLUGIN_NAME } from "./constants"

import type { CodeceptJSOutput } from "./types"

export const parseError = (e: unknown) =>
    axios.isAxiosError(e) && e.response
        ? e.response.data
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

export const log = (msg: string) => (output as CodeceptJSOutput).print(`[${ PLUGIN_NAME }] ${ msg }`)
