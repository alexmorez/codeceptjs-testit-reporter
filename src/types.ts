export interface TestITAdapterConfig {
    url: string,
    configurationId: string,
    projectId: string,
    privateToken: string,
    namespace?: string,
    globalProjectId?: string,
}

export interface CodeceptJsAssertionFailedError extends Error {
    params?: object,
    template?: string
    showDiff?: boolean,
    actual?: string,
    expected?: string,
    inspect?: () => string,
    cliMessage?: () => string,
}

// CodeceptJS types generated from JSDoc and sometimes incorrect, sometimes empty..
export interface CodeceptJsTest extends Omit<Mocha.Test, 'artifacts'> {
    uid?: string,
    err?: CodeceptJsAssertionFailedError,
    artifacts?: {
        screenshot: string
    }
}

export interface CodeceptJsMetaStep extends CodeceptJS.MetaStep {
    id?: string
}

export interface CodeceptJsStep extends Omit<CodeceptJS.Step, 'metaStep'> {
    id?: string
    endTime?: number
    startTime?: number
    metaStep: CodeceptJsMetaStep
}

export type CodeceptJSOutput = typeof CodeceptJS.output & { print: (msg: string) => void }
