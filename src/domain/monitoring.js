function analyzeMention(mention) {
  const body = String(mention.body || "");
  const normalized = body.toLowerCase();
  let classification = "question";
  if (/https?:\/\/|free crypto|buy now|click here/.test(normalized))
    classification = "spam";
  else if (
    /broken|refund|complaint|angry|terrible|doesn'?t work|not working/.test(
      normalized,
    )
  )
    classification = "complaint";
  else if (
    /our business|pricing|demo|hire|purchase|your team help/.test(normalized)
  )
    classification = "lead";
  else if (/\?|how |what |when |where |can i|could i/.test(normalized))
    classification = "question";
  else if (/amazing|thank|great|love|excellent|helpful/.test(normalized))
    classification = "praise";

  const positive = (
    normalized.match(/amazing|thank|great|love|excellent|helpful/g) || []
  ).length;
  const negative = (
    normalized.match(/broken|refund|angry|terrible|bad|failed|not working/g) ||
    []
  ).length;
  const sentiment = Math.max(
    0,
    Math.min(100, 50 + positive * 15 - negative * 20),
  );
  const result = { ...mention, classification, sentiment };
  if (classification === "complaint") {
    result.replyDraft =
      "We are sorry this happened. Please share the relevant details privately so our team can investigate promptly.";
    result.escalation = {
      severity: sentiment < 30 ? "critical" : "warning",
      slaMinutes: sentiment < 30 ? 30 : 120,
    };
  }
  if (classification === "lead") {
    result.escalation = { severity: "info", slaMinutes: 240, handoff: "sales" };
  }
  return result;
}

function evaluateAlerts(snapshot) {
  const rules = [
    [
      "volume_spike",
      snapshot.baselineVolume > 0 &&
        snapshot.volume >= snapshot.baselineVolume * 2,
      "warning",
    ],
    [
      "sentiment_deterioration",
      snapshot.baselineSentiment - snapshot.sentiment >= 20,
      "critical",
    ],
    [
      "viral_negative_content",
      snapshot.viralNegativeReach >= 10000,
      "critical",
    ],
    [
      "competitor_pricing_mention",
      snapshot.competitorPricingMentions > 0,
      "info",
    ],
    ["creator_influencer_mention", snapshot.influencerMentions > 0, "info"],
    ["overdue_critical_reply", snapshot.overdueCriticalReplies > 0, "critical"],
  ];
  return rules
    .filter(([, active]) => active)
    .map(([type, , severity]) => ({
      type,
      severity,
      dedupeKey: `${snapshot.brandId}:${type}:${snapshot.period}`,
      status: "open",
      evidence: snapshot,
    }));
}

module.exports = { analyzeMention, evaluateAlerts };
