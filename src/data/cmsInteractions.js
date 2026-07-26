import { cmsRequest } from "./customCmsClient";

export const submitCmsFeedback = async (record) => {
  try {
    return await cmsRequest("/api/feedback", { method: "POST", body: JSON.stringify(record) });
  } catch {
    return null;
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
