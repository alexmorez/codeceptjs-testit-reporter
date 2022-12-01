import { event, recorder } from "codeceptjs"

import TestITAdapter from "./adapter"

import type { CodeceptJsTest, TestITAdapterConfig } from "./types"


const Reporter = (config: TestITAdapterConfig) => {
    let adapter: TestITAdapter
    try {
        adapter = new TestITAdapter(config)
    } catch (e) {
        console.log(e)
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

    event.dispatcher.on(event.step.started, adapter.initStep)
    event.dispatcher.on(event.step.finished, adapter.completeStep)
    event.dispatcher.on(event.step.comment, adapter.handleStepComment)
}

export default Reporter
