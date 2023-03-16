import { event, output, recorder } from "codeceptjs"

import TestITAdapter from "./Adapter"
import { FORCE_EXIT_SIGNALS } from "./constants"
import { parseError } from "./utils"

import type { CodeceptJsTest, TestITAdapterConfig } from "./types"


const Reporter = (config: TestITAdapterConfig) => {
    let adapter: TestITAdapter
    try {
        adapter = new TestITAdapter(config)
    } catch (e) {
        output.error(parseError(e))
        return
    }

    // recorder injects async functions in a global promises chain
    recorder.startUnlessRunning()

    event.dispatcher.on(event.all.before, () => {
        recorder.add("[TestIT] Init test run", adapter.initTestRun)
    })
    event.dispatcher.on(event.all.after, adapter.completeTestRun)

    event.dispatcher.on(event.test.before, () => {
        recorder.add("[TestIT] Reset test state", adapter.resetTestState)
    })
    event.dispatcher.on(event.test.started, adapter.initTest)
    event.dispatcher.on(event.test.passed, (test: CodeceptJsTest) => {
        recorder.add("[TestIT] Init auto test", () => adapter.initAutoTest(test))
    })
    event.dispatcher.on(event.test.after, (test: CodeceptJsTest) => {
        recorder.add("[TestIT] Complete test", () => adapter.completeTest(test))
    })

    event.dispatcher.on(event.step.before, adapter.initStep)
    event.dispatcher.on(event.step.finished, adapter.completeStep)
    event.dispatcher.on(event.step.comment, adapter.handleStepComment)

    FORCE_EXIT_SIGNALS.forEach(s => process.on(s, adapter.forceCompleteTestRun))
}

export default Reporter
