import { nanoid } from "nanoid"

import { cjs2testItStepStatus } from "./utils"

import type { CodeceptJsStep } from "./types"
import type { AttachmentPutModelAutotestStepResults, AutotestStep } from "testit-api-client"


class StepsProcessor {
    private stepsMap: { [key: string]: AttachmentPutModelAutotestStepResults }
    private stepsTree: AttachmentPutModelAutotestStepResults[]
    private lastProcessedStepComment: string | null
    
    constructor() {
        this.stepsMap = {}
        this.stepsTree = []
        this.lastProcessedStepComment = null
    }

    reset = () => {
        this.stepsMap = {}
        this.stepsTree = []
        this.lastProcessedStepComment = null
    }

    patchStepId = (step: CodeceptJsStep) => {
        // ids may be created by other plugins
        if (!step.id)
            step.id = nanoid()
        if (step.metaStep && !step.metaStep.id)
            this.patchStepId(step.metaStep)
    }

    processComment = (step: string) => {
        this.lastProcessedStepComment = step
    }

    processStep = (step: CodeceptJsStep) => {
        if (!step.id)
            return

        if (step.metaStep && step.metaStep.id) {
            const isMetaStepProcessedBefore = !!this.stepsMap[step.metaStep.id]
            if (!isMetaStepProcessedBefore)
                this.processStep(step.metaStep)
        }

        const stepResult = this._prepareStepResult(step)
        const parentStepResults = !step.metaStep
            ? this.stepsTree
            : this.stepsMap[step.metaStep.id || '']?.stepResults
        if (this.lastProcessedStepComment && !step.isMetaStep()) {
            parentStepResults?.push({ title: this.lastProcessedStepComment })
            this.lastProcessedStepComment = null
        }
        parentStepResults?.push(stepResult)

        const isStepProcessedBefore = !!this.stepsMap[step.id]
        if (!isStepProcessedBefore)
            this.stepsMap[step.id] = stepResult
    }

    private _prepareStepResult = (step: CodeceptJsStep): AttachmentPutModelAutotestStepResults => {
        const stepResult: AttachmentPutModelAutotestStepResults = {
            title: step.toString(),
            duration: step.startTime && step.endTime
                ? (step.endTime - step.startTime)
                : undefined,
            outcome: cjs2testItStepStatus(step.status),
        }
        if (step.isMetaStep())
            stepResult.stepResults = []

        return stepResult
    }

    getStepResults = () => [...this.stepsTree]

    getSteps = (): AutotestStep[] => this._stepResults2steps(this.stepsTree) || []

    private _stepResults2steps = (stepResults?: AttachmentPutModelAutotestStepResults[]): AutotestStep[] | undefined =>
        stepResults?.map(s => ({
            title: s.title || '',
            steps: this._stepResults2steps(s.stepResults),
        }))

}

export default StepsProcessor
