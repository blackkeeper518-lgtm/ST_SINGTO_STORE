import { afterEach, describe, expect, it, vi } from "vitest";
import { sendMetaMessage } from "./meta";

const credentials = { url: "https://chat-project.supabase.co", serviceRoleKey: "test-service-role-key" };

afterEach(() => vi.unstubAllGlobals());

describe("Messenger Send API error handling", () => {
  it("preserves Meta trace and makes only one send attempt for -1 / 2018012", async () => {
    const trace = "AjDHu3AfyLzVj5wjsj8Rwuz";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ page_id: "page-1", access_token: "page-token", status: "ON" }],
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ error: { message: "() Unexpected internal error", code: -1, error_subcode: 2018012, fbtrace_id: trace } }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendMetaMessage({ pageId: "page-1", recipientId: "customer-1", text: "ทดสอบ" }, credentials))
      .rejects.toThrow(`META_TRANSIENT_INTERNAL: () Unexpected internal error (code=-1, subcode=2018012, trace=${trace})`);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain("graph.facebook.com/v26.0/page-1/messages");
  });
});
