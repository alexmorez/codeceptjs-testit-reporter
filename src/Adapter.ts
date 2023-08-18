import { Attachment, Autotest, Client, ClientConfig } from "testit-api-client"

import StepsProcessor from "./StepsProcessor"
import { CJS_NAMESPACE } from "./constants"
import { cjs2testItStatus, getTestId, log, parseError, parseTestError } from "./utils"

import type { TestITAdapterConfig, CodeceptJsStep, CodeceptJsTest } from "./types"
import type { AutotestPost, AutotestResultsForTestRun } from "testit-api-client"

const defaultConfig = {
    namespace: CJS_NAMESPACE,
}


class Adapter {
    private testTimeMap: { [key: string]: Date }
    private testRunId: string | null
    private testRunResults: AutotestResultsForTestRun[]
    private testAttachments: { [key: string]: string }
    private stepsProcessor: StepsProcessor

    private config: TestITAdapterConfig
    private client: Client

    constructor(config: TestITAdapterConfig) {
        this.testTimeMap = {}
        this.testRunId = null
        this.testRunResults = []
        this.testAttachments = {}
        this.stepsProcessor = new StepsProcessor()

        this.config = {
            ...defaultConfig,
            ...config,
        }

        const testItClientConfig: ClientConfig = {
            url: this.config.url,
            configurationId: this.config.configurationId,
            privateToken: this.config.privateToken,
            projectId: this.config.projectId,
        }
        const emptyRequiredProps = Object.keys(testItClientConfig)
            .filter(p => !testItClientConfig[p as keyof ClientConfig])
            .map(p => p)
        if (emptyRequiredProps.length)
            throw new Error(
                `Invalid TestIT config, following properties are required: ${ emptyRequiredProps.join(", ") }`
            )
        this.client = new Client(testItClientConfig)

        // axios default content-type for empty POST is "application/x-www-form-urlencoded",
        // TestIT server rejects such requests with 415 status code starting from 4+ versions,
        // so we can fix it changing defaults in TestIT client instance
        // @ts-ignore
        this.client.axios.defaults.headers.post['Content-Type'] = 'application/json'
    }

    initTestRun = async () => {
        try {
            const testRunData = this._prepareTestRunData()
            const testRun = await this.client.createTestRun(testRunData)
            this.testRunId = testRun.id
            await this.client.startTestRun(this.testRunId)
        } catch (e) {
            log(`Failed to create and start test run: ${ parseError(e) }`)
        }
    }

    private _prepareTestRunData = () => {
        const testRunDate = new Date()
        return {
            projectId: this.config.projectId,
            name: `${ testRunDate.toISOString() }: ${ this.config.namespace } Run`,
        }
    }

    completeTestRun = async () => {
        if (!this.testRunId) {
            log("Failed to complete test run: testRunId cannot be null")
            return
        }
        try {
            const existingTests = await this.client.getAutotest({ projectId: this.config.projectId })
            const existingTestsIds = new Set()
            existingTests.forEach(t => existingTestsIds.add(t.externalId))

            const filteredResults: AutotestResultsForTestRun[] = []
            this.testRunResults.forEach(r => {
                // Autotest creates in TestIT only when test passed.
                // If test failed at first run, autotest will not exist,
                // so we cannot load results for it.
                if (existingTestsIds.has(r.autotestExternalId))
                    filteredResults.push(r)
                else
                    log(`Not found "${ r.autotestExternalId }" in existing tests ids, test run result ignored`)
            })
            await this.client.completeTestRun(this.testRunId)
            await this.client.loadTestRunResults(this.testRunId, filteredResults)

            const testRunLink = this._prepareTestRunLink()
            if (testRunLink)
                log(`Test run link: ${ testRunLink }`)
        } catch (e) {
            log(`Failed to complete test run: ${ parseError(e) }`)
        }
    }

    forceCompleteTestRun = () => {
        if (!this.testRunId)
            return
        log('Trying to force complete test run..')
        this.client.completeTestRun(this.testRunId)
            .catch(e => log(`Failed to force complete test run: ${ parseError(e) }`))
            .finally(process.exit)
        this.testRunId = null
    }

    private _prepareTestRunLink() {
        if (
            !this.config.url ||
            !this.config.globalProjectId ||
            !this.testRunId
        )
            return null
        return `${ this.config.url }/projects/${ this.config.globalProjectId }/test-runs/${ this.testRunId }`
    }

    initAutoTest = async (test: CodeceptJsTest) => {
        let autoTest: Autotest | null = null
        try {
            const autoTests = await this.client.getAutotest({
                projectId: this.config.projectId,
                externalId: getTestId(test),
            })
            autoTest = autoTests[0]
        } catch (e) {
            log(`Failed to fetch autotest: ${ parseError(e) }`)
        }
        const autoTestData = this._prepareAutoTestData(test)
        try {
            if (!autoTest)
                await this.client.createAutotest(autoTestData)
            else
                await this.client.updateAutotest(autoTestData)
        } catch (e) {
            log(`Failed to create/update autotest: ${ parseError(e) }`)
        }
    }

    private _prepareAutoTestData = (test: CodeceptJsTest): AutotestPost => {
        return {
            projectId: this.config.projectId,
            externalId: getTestId(test),
            namespace: this.config.namespace,
            classname: test.parent?.title,
            name: test.title,
            title: test.title,
            steps: this.stepsProcessor.getSteps(),
            labels: test.tags.map(t => ({ name: t })),
        }
    }

    resetTestState = async () => {
        this.stepsProcessor.reset()
    }

    initTest = (test: CodeceptJsTest) => {
        this.testTimeMap[getTestId(test)] = new Date()
    }

    completeTest = async (test: CodeceptJsTest) => {
        if (test.artifacts?.screenshot) {
            const attachment = await this._uploadAttachment(test.artifacts.screenshot)
            if (attachment?.id)
                this.testAttachments[getTestId(test)] = attachment.id
        }

        const testRunResult = this._prepareTestRunResult(test)
        if (testRunResult)
            this.testRunResults.push(testRunResult)
    }

    private _uploadAttachment = async (filepath: string) => {
        let attachment: Attachment
        try {
            attachment = await this.client.loadAttachment(filepath)
        } catch (e) {
            log(`Failed to upload attachment: ${ parseError(e) }`)
            return null
        }
        return attachment
    }

    private _prepareTestRunResult = (test: CodeceptJsTest): (AutotestResultsForTestRun | null) => {
        const status = cjs2testItStatus(test.state)
        if (!status) {
            log(`Cannot map CodeceptJS status "${ test.state }" to TestIT status, test run result ignored`)
            return null
        }
        let testRunResult: AutotestResultsForTestRun
        try {
            testRunResult = {
                configurationId: this.config.configurationId,
                autotestExternalId: getTestId(test),
                outcome: status,
                duration: this._getTestDuration(test),
                startedOn: this._getTestStartTime(test),
                traces: parseTestError(test),
                stepResults: this.stepsProcessor.getStepResults(),
            }
            if (this.testAttachments[getTestId(test)])
                testRunResult.attachments = [{ id: this.testAttachments[getTestId(test)] }]
        } catch (e) {
            log(`Failed to prepare test run result: ${ e?.toString() }`)
            return null
        }
        return testRunResult
    }

    private _getTestDuration = (test: CodeceptJsTest) => {
        return this.testTimeMap[getTestId(test)]
            ? Date.now() - this.testTimeMap[getTestId(test)].getTime()
            : 0
    }

    private _getTestStartTime = (test: CodeceptJsTest) => {
        return this.testTimeMap[getTestId(test)]
            ? this.testTimeMap[getTestId(test)].toISOString()
            : undefined
    }

    initStep = (step: CodeceptJsStep) => {
        this.stepsProcessor.patchStepId(step)
    }

    completeStep = (step: CodeceptJsStep) => {
        this.stepsProcessor.processStep(step)
    }

    handleStepComment = (step: string) => {
        this.stepsProcessor.processComment(step)
    }
}

export default Adapter
