import assert from "node:assert/strict";
import test from "node:test";
import { redactPath, sanitizeLogValue } from "../src/utils/logger.js";

test("redactPath keeps only the final folder and file for Windows paths", () => {
  assert.equal(redactPath("E:\\Users\\name\\Models\\foo\\model.json"), "...\\foo\\model.json");
});

test("redactPath keeps only the final folder and file for Unix paths", () => {
  assert.equal(redactPath("/Users/name/Models/foo/model.json"), ".../foo/model.json");
});

test("redactPath leaves ordinary strings unchanged", () => {
  assert.equal(redactPath("models/haru/model.json"), "models/haru/model.json");
});

test("sanitizeLogValue redacts sensitive keys recursively", () => {
  const value = sanitizeLogValue({
    provider: "openai",
    api_key: "sk-test",
    nested: {
      authorization: "Bearer secret",
      path: "E:\\Users\\name\\Models\\foo\\model.json",
    },
  });

  assert.deepEqual(value, {
    provider: "openai",
    api_key: "[redacted]",
    nested: {
      authorization: "[redacted]",
      path: "...\\foo\\model.json",
    },
  });
});

test("sanitizeLogValue serializes Error objects without stack traces", () => {
  assert.deepEqual(sanitizeLogValue(new Error("failed at E:\\Users\\name\\Models\\foo\\model.json")), {
    name: "Error",
    message: "failed at ...\\foo\\model.json",
  });
});
