/**
 * Solve Acess — Excel (.xlsx) writer
 * Pure-JS, dependency-free XLSX generation using inline strings and store-only ZIP.
 * Exposes window.Excel with a small workbook API tailored for audit reports.
 */
(function () {
  'use strict';

  function utf8(str) {
    return new TextEncoder().encode(str);
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      crc ^= bytes[i];
      for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function dosDateTime(date) {
    const d = date instanceof Date ? date : new Date();
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const day = (d.getFullYear() - 1980) << 9 | ((d.getMonth() + 1) << 5) | d.getDate();
    return { time, date: day };
  }

  function u16(value) {
    return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
  }
  function u32(value) {
    return new Uint8Array([value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff]);
  }

  function concat(parts) {
    let total = 0;
    for (const p of parts) total += p.length;
    const out = new Uint8Array(total);
    let offset = 0;
    for (const p of parts) { out.set(p, offset); offset += p.length; }
    return out;
  }

  const XL_CELL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function colName(index) {
    let name = '';
    let i = index;
    while (i >= 0) {
      name = XL_CELL[i % 26] + name;
      i = Math.floor(i / 26) - 1;
    }
    return name;
  }

  const SERIAL_EPOCH = new Date(Date.UTC(1899, 11, 30));
  function excelSerial(date) {
    return (date.getTime() - SERIAL_EPOCH.getTime()) / 86400000;
  }

  /* ─── Workbook model ──────────────────────────────────────────────── */
  function newSheet(title) {
    const rows = [];
    const cols = [];
    return {
      title,
      rows,
      cols,
      setColumnWidth(index, width) { cols[Number(index)] = width; },
      row(values, opts) {
        opts = opts || {};
        const moneyCols = opts.money || [];
        const cells = values.map((v, i) => {
          let t = 'inlineStr';
          let s = 0;
          let value = v;
          if (typeof v === 'number') {
            t = 'n';
            s = moneyCols.indexOf(i) !== -1 ? 2 : (opts.bold ? 3 : 0);
            value = String(v);
          } else if (v instanceof Date) {
            t = 'n';
            s = opts.datetime ? 7 : 6;
            value = excelSerial(v).toFixed(5);
          } else {
            value = v === undefined || v === null ? '' : String(v);
            if (opts.header) s = 1;
            else if (opts.bold) s = 3;
            else if (opts.title) s = 4;
            else if (opts.center) s = 8;
          }
          return { v: value, t, s };
        });
        rows.push(cells);
        return this;
      },
      moneyRow(values, opts) {
        const money = [];
        values.forEach((v, i) => { if (typeof v === 'number') money.push(i); });
        return this.row(values, Object.assign({}, opts || {}, { money }));
      },
      blank() {
        rows.push([]);
        return this;
      }
    };
  }

  /* ─── XML builders ─────────────────────────────────────────────────  */
  function escXml(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  function workbookXml(sheets) {
    const sheetXml = sheets.map((s, i) => `<sheet name="${escXml(s.title)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetXml}</sheets></workbook>`;
  }

  function relsXml(sheets) {
    const items = sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  }

  function contentTypesXml(sheets) {
    const overrides = sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${overrides}</Types>`;
  }

  function rootRelsXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  }

  function stylesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="4">
<numFmt numFmtId="164" formatCode="DD/MM/YYYY"/>
<numFmt numFmtId="165" formatCode="DD/MM/YYYY hh:mm"/>
<numFmt numFmtId="166" formatCode="&quot;Kz &quot; #,##0.00"/>
<numFmt numFmtId="167" formatCode="#,##0"/>
</numFmts>
<fonts count="3">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="12"/><color rgb="FF1F2937"/><name val="Calibri"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1F2937"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="9">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"><alignment horizontal="right"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment horizontal="left" vertical="center"/></xf>
<xf numFmtId="166" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyNumberFormat="1" applyBorder="1"><alignment horizontal="right"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment horizontal="center"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
  }

  function sheetXml(sheet, sheetIndex, colSpecs) {
    const maxCols = sheet.rows.reduce((max, row) => Math.max(max, row.length), 0);
    let colsXml = '';
    let hasWidths = colSpecs.some((w) => w && w > 0);
    if (hasWidths) {
      const colTags = [];
      for (let i = 0; i < maxCols; i++) {
        const width = colSpecs[i] || 11;
        colTags.push(`<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`);
      }
      colsXml = `<cols>${colTags.join('')}</cols>`;
    }

    const rowsXml = sheet.rows.map((cells, r) => {
      if (!cells.length) return `<row r="${r + 1}"/>`;
      const cellsXml = cells.map((c, i) => {
        const ref = `${colName(i)}${r + 1}`;
        const attrs = `r="${ref}"${c.s ? ` s="${c.s}"` : ''}${c.t === 'n' ? '' : ' t="inlineStr"'}`;
        if (c.t === 'n') return `<c ${attrs}><v>${c.v}</v></c>`;
        return `<c ${attrs}><is><t xml:space="preserve">${escXml(c.v)}</t></is></c>`;
      }).join('');
      return `<row r="${r + 1}">${cellsXml}</row>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${colsXml}<sheetData>${rowsXml}</sheetData></worksheet>`;
  }

  /* ─── ZIP assembly (store only) ───────────────────────────────────── */
  const ZIP_LOCAL = 0x04034b50;
  const ZIP_CENTRAL = 0x02014b50;
  const ZIP_EOCD = 0x06054b50;

  function zipStore(files) {
    const parts = [];
    const central = [];
    let offset = 0;
    for (const file of files) {
      const name = utf8(file.name);
      const data = file.data;
      const crc = crc32(data);
      const { time, date } = dosDateTime(new Date());
      const encodedNameLength = name.length;

      const local = concat([
        u32(ZIP_LOCAL), u16(20), u16(0), u16(0),
        u16(time), u16(date), u32(crc),
        u32(data.length), u32(data.length),
        u16(encodedNameLength), u16(0),
        name, data
      ]);
      parts.push(local);

      const centralEntry = concat([
        u32(ZIP_CENTRAL), u16(20), u16(20), u16(0), u16(0),
        u16(time), u16(date), u32(crc),
        u32(data.length), u32(data.length),
        u16(encodedNameLength), u16(0), u16(0),
        u16(0), u16(0), u32(0),
        u32(offset),
        name
      ]);
      central.push(centralEntry);
      offset += local.length;
    }

    const centralDir = concat(central);
    const eocd = concat([
      u32(ZIP_EOCD), u16(0), u16(0),
      u16(files.length), u16(files.length),
      u32(centralDir.length), u32(offset),
      u16(0)
    ]);

    parts.push(centralDir, eocd);
    return concat(parts);
  }

  /* ─── Public API ──────────────────────────────────────────────────── */
  function createWorkbook() {
    const sheets = [];
    return {
      addSheet(title, colWidths) {
        const sheet = newSheet(title);
        if (colWidths) colWidths.forEach((w, i) => sheet.setColumnWidth(i, w));
        sheets.push(sheet);
        return sheet;
      },
      hasSheets() {
        return sheets.length > 0;
      },
      download(filename) {
        if (!sheets.length) return;
        filename = filename || 'relatorio.xlsx';
        const files = [
          { name: '[Content_Types].xml', data: utf8(contentTypesXml(sheets)) },
          { name: '_rels/.rels', data: utf8(rootRelsXml()) },
          { name: 'xl/workbook.xml', data: utf8(workbookXml(sheets)) },
          { name: 'xl/_rels/workbook.xml.rels', data: utf8(relsXml(sheets)) },
          { name: 'xl/styles.xml', data: utf8(stylesXml()) }
        ];
        sheets.forEach((sheet, i) => {
          files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: utf8(sheetXml(sheet, i + 1, sheet.cols)) });
        });

        const zip = zipStore(files);
        const blob = new Blob([zip], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
      }
    };
  }

  window.Excel = { createWorkbook };
  if (typeof globalThis !== 'undefined') globalThis.Excel = window.Excel;
})();