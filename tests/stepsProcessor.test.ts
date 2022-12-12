import StepsProcessor from "../src/StepsProcessor"
import { CJS_STEP_STATUS, TESTIT_STATUS } from "../src/constants"

import type {
    AutotestStep,
    AttachmentPutModelAutotestStepResults,
} from "testit-api-client"

const getFakeStep = (id: string, metaStep?: object) => {
    return ({
        id: id,
        title: id,
        metaStep: metaStep,
        startTime: 1,
        endTime: 2,
        status: CJS_STEP_STATUS.SUCCESS,
        isMetaStep: () => id.startsWith("m"),
        toString: () => id,
    })
}

const CJS_STEPS = [
    getFakeStep(
        '01',
        getFakeStep(
            'm01',
            getFakeStep(
                'm00',
            ),
        ),
    ),
    "middle comment",
    getFakeStep(
        "02",
        getFakeStep(
            "m01",
            getFakeStep(
                "m00",
            ),
        ),
    ),
    getFakeStep(
        "03",
        getFakeStep("m00"),
    ),
    "root comment",
    getFakeStep("04"),
    getFakeStep(
        "05",
        getFakeStep("m02"),
    ),
    "edge comment",  // because of this, comments pushes to stepResults after next step, not on event.step.comment
    getFakeStep(
        "06",
        getFakeStep("m03"),
    ),
]

const EXPECTED_STEPS: AutotestStep[] = [
    {
        "title": "m00",
        "steps": [
            {
                "title": "m01",
                "steps": [
                    { "title": "01" },
                    { "title": "middle comment" },
                    { "title": "02" },
                ],
            },
            { "title": "03" },
        ],
    },
    { "title": "root comment" },
    { "title": "04" },
    {
        "title": "m02",
        "steps": [
            { "title": "05" },
        ],
    },
    {
        "title": "m03",
        "steps": [
            { "title": "edge comment" },
            { "title": "06" },
        ],
    },
]

const EXPECTED_STEP_RESULTS: AttachmentPutModelAutotestStepResults[] = [
    {
        "title": "m00",
        "outcome": TESTIT_STATUS.PASSED,
        "duration": 1,
        "stepResults": [
            {
                "title": "m01",
                "outcome": TESTIT_STATUS.PASSED,
                "duration": 1,
                "stepResults": [
                    {
                        "title": "01",
                        "outcome": TESTIT_STATUS.PASSED,
                        "duration": 1,
                    },
                    {
                        "title": "middle comment",
                    },
                    {
                        "title": "02",
                        "outcome": TESTIT_STATUS.PASSED,
                        "duration": 1,
                    },
                ],
            },
            {
                "title": "03",
                "outcome": TESTIT_STATUS.PASSED,
                "duration": 1,
            },
        ],
    },
    {
        "title": "root comment",
    },
    {
        "title": "04",
        "outcome": TESTIT_STATUS.PASSED,
        "duration": 1,
    },
    {
        "title": "m02",
        "outcome": TESTIT_STATUS.PASSED,
        "duration": 1,
        "stepResults": [
            {
                "title": "05",
                "outcome": TESTIT_STATUS.PASSED,
                "duration": 1,
            },
        ],
    },
    {
        "title": "m03",
        "outcome": TESTIT_STATUS.PASSED,
        "duration": 1,
        "stepResults": [
            {
                "title": "edge comment",
            },
            {
                "title": "06",
                "outcome": TESTIT_STATUS.PASSED,
                "duration": 1,
            },
        ],
    },
]


describe("StepsProcessor", () => {
    const getPreparedStepsProcessor = () => {
        const stepsProcessor = new StepsProcessor()
        for (const step of CJS_STEPS) {
            if (typeof step === "string") {
                stepsProcessor.processComment(step)
            } else {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                stepsProcessor.processStep(step)
            }
        }
        return stepsProcessor
    }

    it("creates steps", () => {
        const stepsProcessor = getPreparedStepsProcessor()
        const stepResults = stepsProcessor.getSteps()
        expect(stepResults).toEqual(EXPECTED_STEPS)
    })

    it("creates step results", () => {
        const stepsProcessor = getPreparedStepsProcessor()
        const stepResults = stepsProcessor.getStepResults()
        expect(stepResults).toEqual(EXPECTED_STEP_RESULTS)
    })

    it("resets steps", () => {
        const stepsProcessor = getPreparedStepsProcessor()
        expect(stepsProcessor.getSteps().length).toBeGreaterThan(0)
        expect(stepsProcessor.getStepResults().length).toBeGreaterThan(0)

        stepsProcessor.reset()
        expect(stepsProcessor.getSteps().length).toEqual(0)
        expect(stepsProcessor.getStepResults().length).toEqual(0)
    })
})
