import { useEffect, useState } from "react";
import cmsConfig from "../data/cmsConfig";
import { readCmsVisitCount, recordCmsVisit } from "../data/cmsInteractions";

let visitorRequest = null;

const loadVisitorCount = async () => {
  const recordedCount = await recordCmsVisit();
  return recordedCount ?? readCmsVisitCount();
};

export const useVisitorCount = () => {
  const [count, setCount] = useState(null);

  useEffect(() => {
    if (!cmsConfig.enabled) {
      return undefined;
    }

    let cancelled = false;

    if (!visitorRequest) {
      visitorRequest = loadVisitorCount().finally(() => {
        visitorRequest = null;
      });
    }

    visitorRequest.then((nextCount) => {
      if (!cancelled && nextCount !== null) {
        setCount(nextCount);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return count;
};
