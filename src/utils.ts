import { createHash } from "crypto"

import axios from "axios"
import { output } from "codeceptjs"

import { CJS_2_TESTIT_STATUS_MAP, CJS_2_TESTIT_STEP_STATUS_MAP, PLUGIN_NAME } from "./constants"

import type { CodeceptJSOutput, CodeceptJsTest } from "./types"

export const parseError = (e: unknown) =>
    axios.isAxiosError(e) && e.response
        ? e.response.data
        : e instanceof Error
            ? e.toString()
            : 'Unknown error'

export const parseTestError = (test: CodeceptJsTest) => {
    let msg = test?.err?.stack
    if (typeof test.err?.inspect === "function") {
        msg = test?.err.inspect()
        if (test?.err.expected && test?.err.actual)
            msg += ` (expected: ${ test.err.expected }, actual: ${ test.err.actual })`
    }
    return msg
}

const genTestId = (test: CodeceptJsTest) =>
    createHash("md5")
        .update(test.fullTitle())
        .digest('base64')
        // eslint-disable-next-line no-magic-numbers
        .slice(0, -2)


export const getTestId = (test: CodeceptJsTest) => test.uid || genTestId(test)

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
