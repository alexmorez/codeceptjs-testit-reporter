export interface ErrorWithStack {
    stack?: string
}

export interface OutputLogEntry {
    line: string,
    duration?: number,
    status?: string,
}

export interface OutputConfig {
    filterFn?: (s?: string) => boolean
}

export interface TestITAdapterConfig {
    url: string,
    configurationId: string,
    projectId: string,
    privateToken: string,
    namespace?: string,
    globalProjectId?: string,
}

// CodeceptJS types generated from JSDoc and sometimes incorrect, sometimes empty..
export interface CodeceptJsTest extends Omit<Mocha.Test, 'artifacts'> {
    id: string,
    err?: Error,  // to be honest, err is AssertionFailedError, but it is not typed
    artifacts?: {
        screenshot: string
    }
}

export interface CodeceptJsStep extends CodeceptJS.Step {
    started?: boolean
}
