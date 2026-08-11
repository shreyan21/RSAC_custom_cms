import { useEffect, useState } from "react";
import { readCmsVisitCount, recordCmsVisit } from "../data/cmsInteractions";

let visitorRequest = null;

const normalizeCount = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
};

const loadVisitorCount = async () => {
  const recordedCount = normalizeCount(await recordCmsVisit());
  return recordedCount ?? normalizeCount(await readCmsVisitCount());
};

export const useVisitorCount = () => {
  const [count, setCount] = useState(null);

  useEffect(() => {
    let cancelled = false;

    if (!visitorRequest) {
      visitorRequest = loadVisitorCount().finally(() => {
        visitorRequest = null;
      });
    }

    visitorRequest.then((nextCount) => {
      if (!cancelled && Number.isFinite(nextCount)) {
        setCount(nextCount);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return count;
};
