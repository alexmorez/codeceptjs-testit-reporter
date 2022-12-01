import type { OutcomeType } from "testit-api-client/dist/types/outcome"

export const TESTIT_STATUS = {
    PASSED: 'Passed',
    FAILED: 'Failed',
    PENDING: 'Pending',
    BLOCKED: 'Blocked',
    SKIPPED: 'Skipped',
}

export const CJS_STATUS = {
    PASSED: 'passed',
    FAILED: 'failed',
    SKIPPED: 'skipped',
    FINISHED: 'finished',
}

export const CJS_STEP_STATUS = {
    SUCCESS: 'success',
    FAILED: 'failed',
}

export const CJS_2_TESTIT_STATUS_MAP = {
    [CJS_STATUS.PASSED]: TESTIT_STATUS.PASSED,
    [CJS_STATUS.FAILED]: TESTIT_STATUS.FAILED,
    [CJS_STATUS.SKIPPED]: TESTIT_STATUS.SKIPPED,
} as { [key: string]: OutcomeType }

export const CJS_2_TESTIT_STEP_STATUS_MAP = {
    [CJS_STEP_STATUS.SUCCESS]: TESTIT_STATUS.PASSED,
    [CJS_STEP_STATUS.FAILED]: TESTIT_STATUS.FAILED,
} as { [key: string]: OutcomeType }

export const CJS_NAMESPACE = "CodeceptJS"

export const STEP_INDENT = 4
