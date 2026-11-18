import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { evaluateFramingHeaders, extractTitle, isPrivateHost } from "./embed";

export type EmbedCheck = {
  status: "ok" | "blocked" | "unknown";
  reason: "x-frame-options" | "csp" | null;
  title: string | null;
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

/** Checks whether a site allows being shown inside Janela and grabs its page title. */
export const checkEmbed = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ url: z.string().url().max(2048) }).parse(d))
  .handler(async ({ data }): Promise<EmbedCheck> => {
    const target = new URL(data.url);
    if (!/^https?:$/.test(target.protocol) || isPrivateHost(target.hostname)) {
      return { status: "unknown", reason: null, title: null };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    try {
      const res = await fetch(target.toString(), {
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,*/*;q=0.8" },
      });
      const verdict = evaluateFramingHeaders(
        res.headers.get("x-frame-options"),
        res.headers.get("content-security-policy"),
      );
      let title: string | null = null;
      const isHtml = (res.headers.get("content-type") ?? "").includes("html");
      if (isHtml && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let html = "";
        while (html.length < 96_000) {
          const { done, value } = await reader.read();
          if (done) break;
          html += decoder.decode(value, { stream: true });
          if (/<\/title>/i.test(html)) break;
        }
        reader.cancel().catch(() => {});
        title = extractTitle(html);
      } else {
        res.body?.cancel().catch(() => {});
      }
      return { status: verdict.embeddable ? "ok" : "blocked", reason: verdict.reason, title };
    } catch (err) {
      console.warn("embed check failed", target.hostname, err);
      return { status: "unknown", reason: null, title: null };
    } finally {
      clearTimeout(timer);
    }
  });
