const countVisits = async (database) => {
  const row = await database("rsac_site_visits")
    .count({ count: "id" })
    .first();
  const count = Number(row?.count);

  return Number.isFinite(count) ? count : 0;
};

export default {
  id: "rsac-visit-counter",
  handler: (router, { database, logger }) => {
    router.get("/", async (_request, response, next) => {
      try {
        response.set("Cache-Control", "no-store");
        response.json({ data: { count: await countVisits(database) } });
      } catch (error) {
        logger.error(error, "Unable to read RSAC visitor count");
        next(error);
      }
    });

    router.post("/", async (_request, response, next) => {
      try {
        await database("rsac_site_visits").insert({ source: "website" });
        response.set("Cache-Control", "no-store");
        response.status(201).json({
          data: { count: await countVisits(database) },
        });
      } catch (error) {
        logger.error(error, "Unable to record RSAC website visit");
        next(error);
      }
    });
  },
};
