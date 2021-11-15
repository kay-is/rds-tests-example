const outputs = require("../outputs.json");

const http = require("https");

const baseUrl = outputs.RdsTestExampleStack.ApiUrl;
const get = (url: string) => new Promise((r) => http.get(url, r));

describe("Lambda backed API Gateway", () => {
  const times = 50;
  beforeEach(() => {
    jest.setTimeout(10000);
  });

  describe("index route", () => {
    it("1 call (cold-start)", async () => {
      await get(baseUrl + "/");
    });

    it(times + " calls", async () => {
      for (let i = 0; i < times; ++i) await get(baseUrl + "/");
    });
  });

  describe("database route", () => {
    it("1 call (cold-start)", async () => {
      await get(baseUrl + "/database");
    });

    it(times + " calls", async () => {
      for (let i = 0; i < times; ++i) await get(baseUrl + "/database");
    });
  });
});
