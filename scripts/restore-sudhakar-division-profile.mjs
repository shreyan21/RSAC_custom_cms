import { config as loadEnv } from "dotenv";
import pg from "pg";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) throw new Error("CMS_DATABASE_URL missing.");

const profileHtml = [
  "<table><tbody>",
  "<tr><th>Designation</th><td><p>Scientist-SE &amp; Head, School of Geoinformatics Division</p></td></tr>",
  "<tr><th>Area of Specialization</th><td><ul>",
  "<li>Water Resources with proficiency in applying satellite Remote Sensing and GIS techniques especially for surface and ground water management. Apart from this, a thorough proficiency in management of other natural resources as well.</li>",
  "<li>Expertise in Geo-environmental assessment by applying Remote Sensing, LIDAR, GPS and G.I.S. for Hydrological, Glaciological aspects and Environmental studies.</li>",
  "<li>Site suitability analysis for civil engineering projects and action plan formulation for sustainable development of Land and Water resources has been another domain of expertise. Expertise in development of Disaster Management plans at state level, particularly for floods and droughts.</li>",
  "<li>Presently acting as a Life Member of the Indian Meteorological Society. Having worked as an Assistant Professor in the Department of Geology, University of Lucknow, teaching has been an added specialization. At present, as Head of the School of Geoinformatics at RSAC-U.P., Lucknow, he imparts technical education in Remote Sensing and GIS to postgraduate students.</li>",
  "</ul></td></tr>",
  "<tr><th>Experience in Years/Projects</th><td><p><strong>28+ years</strong></p><p><strong>38 projects</strong> of national and international repute</p><p><small>For technical papers and reports, please visit the Surface Water Resources Division section of this website.</small></p><p><strong>9 consultancy projects</strong></p></td></tr>",
  "<tr><th>No. of Publications</th><td><p>58<br>Reports: 31</p></td></tr>",
  "<tr><th>Contact No.</th><td><p>0522-2730815 (Ext. 120), 8765977668, 9335918075</p></td></tr>",
  "<tr><th>Email ID</th><td><p><a href=\"mailto:shuklasudhakar1@gmail.com\">shuklasudhakar1@gmail.com</a></p></td></tr>",
  "</tbody></table>",
].join("");

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

try {
  const result = await client.query(
    `SELECT id, entry_key, data_en
       FROM cms_entries
      WHERE collection='pages' AND entry_key='school-of-geo-informatics-division1'
      FOR UPDATE`
  );
  if (result.rowCount !== 1) throw new Error("School of Geo-Informatics page not found.");

  const row = result.rows[0];
  const dataEn = structuredClone(row.data_en || {});
  const block = (dataEn.blocks || []).find((item) =>
    item?.id === "0a5ca04d-e20f-4516-ac39-98180e82144f" ||
    String(item?.value || item?.label || "").trim() === "Scientific Manpower"
  );
  if (!block) throw new Error("Scientific Manpower section not found.");

  block.children ||= [];
  const childIndex = block.children.findIndex((child) => child?.key === "profile-content:e-142");
  const child = {
    ...(childIndex >= 0 ? block.children[childIndex] : {}),
    key: "profile-content:e-142",
    label: "Dr. Sudhakar Shukla",
    value: "",
    richText: profileHtml,
    hidden: false,
    isNew: true,
  };
  if (childIndex >= 0) block.children[childIndex] = child;
  else block.children.push(child);

  await client.query(
    `UPDATE cms_entries
        SET data_en=$1, version=version+1, updated_at=now()
      WHERE id=$2`,
    [dataEn, row.id]
  );
  console.log("Restored the official Sudhakar Shukla division profile content.");
} finally {
  await client.end();
}
