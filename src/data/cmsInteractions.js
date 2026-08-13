import { cmsRequest } from "./customCmsClient";

export const submitCmsFeedback = async (record) => {
  try {
    return await cmsRequest("/api/feedback", { method: "POST", body: JSON.stringify(record) });
  } catch (error) {
    return { ok: false, error: error?.message || "Feedback submission failed" };
  }
};

export const recordCmsVisit = async () => {
  try {
    return (await cmsRequest("/api/visits", { method: "POST" })).count;
  } catch {
    return null;
  }
};

export const readCmsVisitCount = async () => {
  try {
    return (await cmsRequest("/api/visits")).count;
  } catch {
    return null;
  }
};
