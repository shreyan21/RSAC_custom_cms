import { isDrupalActive } from "./cmsResolve";
import {
  readDrupalVisitCount,
  recordDrupalVisit,
  submitDrupalFeedback,
} from "./drupalClient";

export const submitCmsFeedback = async (record) => {
  if (isDrupalActive()) {
    return submitDrupalFeedback(record);
  }

  return false;
};

export const recordCmsVisit = async () => {
  if (isDrupalActive()) {
    return recordDrupalVisit();
  }

  return null;
};

export const readCmsVisitCount = async () => {
  if (isDrupalActive()) {
    return readDrupalVisitCount();
  }

  return null;
};
