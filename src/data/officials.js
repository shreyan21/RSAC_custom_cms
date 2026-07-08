import cmImage from "../assets/images/cm.webp";

const ajitSinghPalImage = "/officials/ajit-singh-pal.jpg";

const pandhariYadavImage = "/officials/pandhari-yadav.jpeg";

const anilKumarImage = "/officials/anil-kumar.jpg";

const rameshChandraImage = "/officials/ramesh-chandra.jpeg";

export const officials = [
  {
    id: 1,
    name: "Shri Yogi Adityanath",
    role: "Hon'ble Chief Minister",
    department: "President, General Body, RSAC-UP (ex-officio)",
    image: cmImage,
    objectPosition: "center 15%",
  },

  {
    id: 2,
    name: "Shri Anil Kumar",
    role: "Hon'ble Minister",
    department: "Vice President, General Body, RSAC-UP (ex-officio)",
    image: anilKumarImage,
    objectPosition: "center 24%",
  },

  {
    id: 3,
    name: "Shri Ajit Singh Pal",
    role: "Hon'ble State Minister",
    department: "Vice President, General Body, RSAC-UP (ex-officio)",
    image: ajitSinghPalImage,
    objectPosition: "center 22%",
  },

  {
    id: 4,
    name: "Shri Pandhari Yadav",
    role: "IAS",
    department: "C.G.B. (ex-officio), Prin. Secr., Deptt. of S&T, Gov. of UP",
    image: pandhariYadavImage,
    objectPosition: "center 20%",
  },

  {
    id: 5,
    name: "Shri Ramesh Chandra",
    role: "IAS",
    department: "Director, Special Secretary, Department of S&T, Gov. of UP",
    image: rameshChandraImage,
    objectPosition: "center 20%",
  },
];
