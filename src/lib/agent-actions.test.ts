import { actionKey, canCompleteAction, canDismissAction, isTerminal } from "./agent-actions";

describe("agent action lifecycle", () => {
  it("creates stable keys for the same application action", () => {
    const input = { applicationId: "app-1", signalId: null, type: "follow-up" };
    expect(actionKey(input)).toBe(actionKey(input));
  });

  it("allows only pending actions to be completed or dismissed", () => {
    expect(canCompleteAction("pending")).toBe(true);
    expect(canDismissAction("pending")).toBe(true);
    expect(canCompleteAction("completed")).toBe(false);
    expect(canDismissAction("dismissed")).toBe(false);
  });

  it("recognizes terminal states", () => {
    expect(isTerminal("completed")).toBe(true);
    expect(isTerminal("dismissed")).toBe(true);
    expect(isTerminal("pending")).toBe(false);
  });
});
