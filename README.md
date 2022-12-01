# codeceptjs-testit-reporter

Plugin for sending CodeceptJS test run reports to TestIT

## Installation

Add `codeceptjs-testit-reporter` package to your project

```
npm i codeceptjs-testit-reporter
```

## Usage

1. Get TestIT configuration params

- `url` — location of the TestIT instance
- `configurationId` — UUID of [configuration](https://docs.testit.software/user-guide/sozdanie-konfiguracii.html) in instance
- `privateToken` — API secret key (can be found at `/user-profile` path of instance)
- `projectId` — UUID of [project](https://docs.testit.software/user-guide/rabota-s-proektami) in instance
- `globalProjectId` — **optional** global project ID, set it if you want to see link to test run in CodeceptJS output 
- `namespace` — **optional** TestIT namespace to display in test run names and as parent folder in autotests tab 

2. Add plugin to `codecept.conf.js`

```
plugins: {
    testit: {
        require: "codeceptjs-testit-reporter",
        enabled: true,
        url: "https://testit-instance-location.com",
        configurationId: "00000000-0000-0000-0000-000000000000",
        privateToken: "53cr37_1<3Y",
        projectId: "11111111-1111-1111-1111-111111111111",
        globalProjectId: "10101",
        namespace: "E2E",
    }
}
```

3. Run tests
