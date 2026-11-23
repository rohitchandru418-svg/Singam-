/**
 * A minimal PDF writer used to render document placeholders.
 *
 * The seeded season ships document records with logical references (`IRR-AGRINOVA-V3.pdf`,
 * `s3://shoot-assets/...`) rather than real binaries. Rather than leave those "View" links
 * broken, the download route renders a one-page placeholder describing the record, so every
 * document a record lists can be opened.
 */

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Wrap a line to `width` characters so long titles do not run off the page. */
function wrap(line: string, width = 78): string[] {
  const out: string[] = [];
  let rest = line;
  while (rest.length > width) {
    const cut = rest.lastIndexOf(" ", width);
    const at = cut > 0 ? cut : width;
    out.push(rest.slice(0, at));
    rest = rest.slice(at).trimStart();
  }
  out.push(rest);
  return out;
}

export function placeholderPdf(title: string, lines: string[]): Buffer {
  const body = [title, "", ...lines].flatMap((l) => wrap(l));
  const text = ["BT", "/F1 14 Tf", "72 740 Td", "20 TL", ...body.map((l, i) => `${i === 0 ? "" : "T* "}(${escapeText(l)}) Tj`), "ET"].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(text, "latin1")} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}
