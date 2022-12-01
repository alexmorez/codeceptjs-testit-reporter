import { format } from "util"

import type { ErrorWithStack, OutputLogEntry, OutputConfig } from "./types"

const consoleLog = console.log
const consoleError = console.error

const createLogEntry = (line: string, duration?: number, status?: string): OutputLogEntry => ({
    line: line,
    duration: duration,
    status: status,
})


// based on https://github.com/testomatio/reporter/blob/master/lib/output.js
class Output {
    private log: OutputLogEntry[]
    private readonly filterFn

    constructor(opts: OutputConfig = {}) {
        this.log = []
        this.filterFn = opts.filterFn || (() => true)
        this.reset()
    }

    reset = () => {
        this.log = []
        this.stop()  // restore console log if it was overridden
    }

    start = () => {
        console.log = (...args) => {
            const obj: ErrorWithStack = {}
            Error.captureStackTrace(obj)
            const logString = format(...args)
            if (this.filterFn(obj.stack)) {
                this.log.push(createLogEntry(logString))
            }
            consoleLog(logString)
        }

        console.error = (...args) => {
            const obj: ErrorWithStack = {}
            Error.captureStackTrace(obj)
            const logString = format(...args)
            if (this.filterFn(obj.stack)) {
                this.log.push(createLogEntry(logString))
            }
            consoleError(logString)
        }
    }

    push = (line: string, duration?: number, status?: string) => {
        if (!line)
            return
        this.log.push(createLogEntry(line, duration, status))
    }

    all = () => {
        return [...this.log]
    }

    stop = () => {
        console.log = consoleLog
        console.error = consoleError
    }
}

export default Output
