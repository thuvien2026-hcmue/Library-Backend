import express from "express";
const router = express.Router();

const CACHE_TTL_MS = 30_000;
let cache = { at: 0, data: null };

function extractSockToken(html) {
  // rộng hơn: match sockTOKEN = '...' hoặc "..."
  const m = html.match(/sockTOKEN\s*=\s*['"]([^'"]+)['"]/i);
  return m?.[1] || "";
}

function pickNumber(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return Number(v) || 0;
  }
  return 0;
}

async function tryFetch(url, options) {
  const r = await fetch(url, { redirect: "follow", ...options });
  const t = await r.text();
  return { r, t };
}

router.get("/summary", async (req, res) => {
  try {
    const sid = process.env.HISTATS_SID;
    const ccid = process.env.HISTATS_CCID;

    if (!sid) return res.status(400).json({ error: "Missing HISTATS_SID" });
    if (!ccid) return res.status(400).json({ error: "Missing HISTATS_CCID" });

    if (cache.data && Date.now() - cache.at < CACHE_TTL_MS) {
      return res.json(cache.data);
    }

    // ✅ thử https trước, fail thì thử http (histats đôi khi “khó chịu” với server request)
    const summaryPath = `/viewstats/?sid=${encodeURIComponent(sid)}&ccid=${encodeURIComponent(
      ccid
    )}&act=2&f=1`;

    const summaryUrls = [
      `https://www.histats.com${summaryPath}`,
      `http://www.histats.com${summaryPath}`,
    ];

    let htmlRes, html, summaryUrlUsed;

    for (const u of summaryUrls) {
      const out = await tryFetch(u, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      htmlRes = out.r;
      html = out.t;
      summaryUrlUsed = u;

      // nếu trang có token thì break
      if (extractSockToken(html)) break;
    }

    const token = extractSockToken(html);
    const setCookie = htmlRes.headers.get("set-cookie") || "";
    const cookieHeader = setCookie ? setCookie.split(";")[0] : "";

    if (!token) {
      return res.status(502).json({
        error: "Cannot extract Histats token (sockTOKEN).",
        tried: summaryUrls,
        status: htmlRes?.status,
        htmlHead: (html || "").slice(0, 500),
      });
    }

    const postUrlHttps = "https://www.histats.com/viewstats/HST_GET_SUMMARY.php";
    const postUrlHttp = "http://www.histats.com/viewstats/HST_GET_SUMMARY.php";

    const body = new URLSearchParams();
    body.set("AR_REQ[sid]", sid);
    body.set("AR_REQ[CC]", token);
    body.set("dbg", "1");

    async function callApi(postUrl) {
      return tryFetch(postUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
          Referer: summaryUrlUsed,
          Origin: summaryUrlUsed.startsWith("https")
            ? "https://www.histats.com"
            : "http://www.histats.com",
          "User-Agent": "Mozilla/5.0",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body,
      });
    }

    // ✅ thử https trước, fail thì thử http
    let apiOut = await callApi(postUrlHttps);
    let text = apiOut.t;

    // histats hay trả "err:1" / "error=11"
    if (!text || text.includes("err:1") || text.includes("error=11")) {
      apiOut = await callApi(postUrlHttp);
      text = apiOut.t;
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: "Histats returned non-JSON",
        summaryUrlUsed,
        postStatus: apiOut.r?.status,
        rawHead: (text || "").slice(0, 500),
      });
    }

    const livesummary = json?.livearray?.livesummary || {};

    const data = {
      sid,
      online: pickNumber(livesummary, ["cur_online", "online"]),
      visitsToday: pickNumber(livesummary, ["today_visits", "td_visits", "today_hits"]),
      visitsTotal: pickNumber(livesummary, ["total_visits", "tot_visits", "all_visits"]),
      visitorsToday: pickNumber(livesummary, ["today_visitors", "today_uniq", "td_visitors"]),
      visitorsTotal: pickNumber(livesummary, ["total_visitors", "tot_visitors", "all_visitors"]),
      fetchedAt: new Date().toISOString(),
    };

    cache = { at: Date.now(), data };
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Server error" });
  }
});

export default router;
