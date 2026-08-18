import { readFileSync, writeFileSync } from "node:fs";

const themePath = "/home/ubuntu/lutcalc-redesign/client/src/themes/leica.theme.json";
const fontPath = "/home/ubuntu/webdev-static-assets/lutcalc/lg1056_regular.woff2";
const theme = JSON.parse(readFileSync(themePath, "utf8"));
const dataUri = `data:font/woff2;base64,${readFileSync(fontPath).toString("base64")}`;
theme.fontFace = {
  family: "Leica LG1056",
  source: dataUri,
  weight: "400",
  style: "normal",
  format: "woff2",
};
writeFileSync(themePath, `${JSON.stringify(theme, null, 2)}\n`);
console.log(`Embedded ${dataUri.length} characters into ${themePath}`);
