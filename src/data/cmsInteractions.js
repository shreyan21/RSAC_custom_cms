import cmsConfig from "./cmsConfig";
import {
  readDirectusCount,
  recordDirectusVisit,
  submitDirectusFeedback,
} from "./directusClient";
import {
  readDrupalVisitCount,
  recordDrupalVisit,
  submitDrupalFeedback,
} from "./drupalClient";

export const submitCmsFeedback = async (record) => {
  if (cmsConfig.provider === "drupal") {
    return (
      (await submitDrupalFeedback(record)) ||
      (await submitDirectusFeedback(record))
    );
  }

  return submitDirectusFeedback(record);
};

export const recordCmsVisit = async () => {
  if (cmsConfig.provider === "drupal") {
    return (await recordDrupalVisit()) || (await recordDirectusVisit());
  }

  return recordDirectusVisit();
};

export const readCmsVisitCount = async () => {
  if (cmsConfig.provider === "drupal") {
    return (
      (await readDrupalVisitCount()) ||
      (await readDirectusCount(cmsConfig.collections.visits))
    );
  }

  return readDirectusCount(cmsConfig.collections.visits);
};
