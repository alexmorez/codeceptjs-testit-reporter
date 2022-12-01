import { Attachment, Autotest, Client } from "testit-api-client"

import {
    CJS_NAMESPACE,
    STEP_INDENT,
} from "./constants"
import Output from "./output"
import { cjs2testItStatus, cjs2testItStepStatus, indent, parseError } from "./utils"

import type { TestITAdapterConfig, CodeceptJsStep, CodeceptJsTest } from "./types"
import type { AutotestPost, AutotestResultsForTestRun } from "testit-api-client/dist/types"

const defaultConfig = {
    namespace: CJS_NAMESPACE,
}


class TestITAdapter {
    private testTimeMap: { [key: string]: Date }
    private testRunId: string | null
    private testRunResults: AutotestResultsForTestRun[]
    private testAttachments: { [key: string]: string }
    
    private currentMetaStep: CodeceptJsStep[]
    private stepShift: number
    private stepStart: Date
    private output: Output

    private config: TestITAdapterConfig
    private client: Client

    constructor(config: TestITAdapterConfig) {
        this.testTimeMap = {}
        this.testRunId = null
        this.testRunResults = []
        this.testAttachments = {}

        this.currentMetaStep = []
        this.stepShift = 0
        this.stepStart = new Date()
        this.output = new Output({
            filterFn: (s?: string) => !s?.includes('codeceptjs/lib/output'),
        })

        this.config = {
            ...defaultConfig,
            ...config,
        }

        if (
            !this.config.url ||
            !this.config.configurationId ||
            !this.config.privateToken ||
            !this.config.projectId
        )
            throw('[TestIT] Invalid config')

        this.client = new Client({
            url: this.config.url,
            configurationId: this.config.configurationId,
            privateToken: this.config.privateToken,
            projectId: this.config.projectId,
        })
    }

    private _getTestDuration = (test: CodeceptJsTest) => {
        return this.testTimeMap[test.id]
            ? Date.now() - this.testTimeMap[test.id].getTime()
            : 0
    }

    private _getTestStartTime = (test: CodeceptJsTest) => {
        return this.testTimeMap[test.id]
            ? this.testTimeMap[test.id].toISOString()
            : undefined
    }

    private _prepareAutoTestData = (test: CodeceptJsTest): AutotestPost => {
        return {
            projectId: this.config.projectId,
            externalId: test.id,
            namespace: this.config.namespace,
            classname: test.parent?.title,
            name: test.title,
            title: test.title,
            steps: this.output.all().map(entry => ({ title: entry.line })),
            labels: test.tags.map(t => ({ name: t })),
        }
    }

    private _prepareTestRunResult = (test: CodeceptJsTest): (AutotestResultsForTestRun | null) => {
        const status = cjs2testItStatus(test.state)
        if (!status) {
            console.log(
                `[TestIT] Cannot map CodeceptJS status "${ test.state }" to TestIT status, ` +
                `test run result ignored`
            )
            return null
        }
        let testRunResult: AutotestResultsForTestRun
        try {
            testRunResult = {
                configurationId: this.config.configurationId,
                autotestExternalId: test.id,
                outcome: status,
                duration: this._getTestDuration(test),
                startedOn: this._getTestStartTime(test),
                traces: test.err?.toString(),
                stepResults: this.output.all().map(entry => ({
                    title: entry.line,
                    duration: entry.duration,
                    outcome: cjs2testItStepStatus(entry.status),
                })),
            }
            if (this.testAttachments[test.id])
                testRunResult.attachments = [{ id: this.testAttachments[test.id] }]
        } catch (e) {
            console.log('[TestIT] Failed to prepare test run result: ', e?.toString())
            return null
        }
        return testRunResult
    }

    private _prepareTestRunLink() {
        if (
            !this.config.url ||
            !this.config.globalProjectId ||
            !this.testRunId
        )
            return null
        return `${ this.config.url }/projects/${ this.config.globalProjectId }/autotests/test-runs/${ this.testRunId }`
    }

    private _uploadAttachment = async (filepath: string) => {
        let attachment: Attachment
        try {
            attachment = await this.client.loadAttachment(filepath)
        } catch (e) {
            console.log('[TestIT] Failed to upload attachment:', parseError(e))
            return null
        }
        return attachment
    }

    initTestRun = async () => {
        try {
            const testRunDate = new Date()
            const testRun = await this.client.createTestRun({
                projectId: this.config.projectId,
                name: `${ testRunDate.toISOString() }: ${ this.config.namespace } Run`,
            })
            this.testRunId = testRun.id
            await this.client.startTestRun(this.testRunId)
        } catch (e) {
            console.log('[TestIT] Failed to create and start test run:', parseError(e))
        }
    }

    completeTestRun = async () => {
        if (!this.testRunId) {
            console.log("[TestIT] Failed to complete test run: testRunId cannot be null")
            return
        }
        try {
            const existingTests = await this.client.getAutotest({ projectId: this.config.projectId })
            const existingTestsIds = new Set()
            existingTests.forEach(t => existingTestsIds.add(t.externalId))
            const filteredResults: AutotestResultsForTestRun[] = []
            this.testRunResults.forEach(r => {
                // Autotest created in TestIT only when test passed.
                // If test failed at first run, autotest will not exist,
                // so we cannot load results for it.
                if (existingTestsIds.has(r.autotestExternalId))
                    filteredResults.push(r)
                else
                    console.log(
                        `[TestIT] Not found "${ r.autotestExternalId }" in existing tests ids, ` +
                        `test run result ignored`
                    )
            })
            await this.client.completeTestRun(this.testRunId)
            await this.client.loadTestRunResults(this.testRunId, filteredResults)

            const testRunLink = this._prepareTestRunLink()
            if (testRunLink)
                console.log(`[TestIT] Test run link: ${ this._prepareTestRunLink() }`)
        } catch (e) {
            console.log('[TestIT] Failed to complete test run:', parseError(e))
        }
    }

    initAutoTest = async (test: CodeceptJsTest) => {
        let autoTest: Autotest | null = null
        try {
            const autoTests = await this.client.getAutotest({
                projectId: this.config.projectId,
                externalId: test.id,
            })
            autoTest = autoTests[0]
        } catch (e) {
            console.log('[TestIT] Failed to fetch autotest:', parseError(e))
        }
        const autoTestData = this._prepareAutoTestData(test)
        try {
            if (!autoTest)
                await this.client.createAutotest(autoTestData)
            else
                await this.client.updateAutotest(autoTestData)
        } catch (e) {
            console.log('[TestIT] Failed to create/update autotest:', parseError(e))
        }
    }

    resetTestState = async () => {
        this.currentMetaStep = []
        this.output.reset()
        this.output.start()
        this.stepShift = 0
    }

    initTest = (test: CodeceptJsTest) => {
        this.testTimeMap[test.id] = new Date()
    }

    completeTest = async (test: CodeceptJsTest) => {
        if (test.artifacts?.screenshot) {
            const attachment = await this._uploadAttachment(test.artifacts.screenshot)
            if (attachment?.id)
                this.testAttachments[test.id] = attachment.id
        }
        const testRunResult = this._prepareTestRunResult(test)
        if (testRunResult)
            this.testRunResults.push(testRunResult)
        this.output.stop()
    }

    initStep = (step: CodeceptJsStep) => {
        this.stepShift = 0
        step.started = true
        this.stepStart = new Date()
    }

    completeStep = (step: CodeceptJsStep) => {
        // steps processing based on https://github.com/testomatio/reporter/blob/master/lib/adapter/codecept.js
        if (!step.started)
            return

        let processingStep = step
        const metaSteps = []
        while (processingStep.metaStep) {
            metaSteps.unshift(processingStep.metaStep)
            processingStep = processingStep.metaStep
        }
        const shift = metaSteps.length

        for (let i = 0; i < Math.max(this.currentMetaStep.length, metaSteps.length); i++) {
            if (this.currentMetaStep[i] !== metaSteps[i]) {
                this.stepShift = STEP_INDENT * i
                if (!metaSteps[i])
                    continue
                if (metaSteps[i].isBDD())
                    this.output.push(indent(this.stepShift) + metaSteps[i].toString() + metaSteps[i].comment)
                else
                    this.output.push(indent(this.stepShift) + metaSteps[i].toString())
            }
        }
        this.currentMetaStep = metaSteps
        this.stepShift = STEP_INDENT * shift

        const duration = (new Date()).getTime() - this.stepStart.getTime()
        this.output.push(indent(this.stepShift) + step.toString(), duration, step.status)
    }

    handleStepComment = (step: CodeceptJsStep) => {
        this.output.push(step.toString())
    }
}

export default TestITAdapter
