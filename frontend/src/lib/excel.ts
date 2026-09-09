import * as XLSX from "xlsx";
import i18n from "../i18n/config";
import { ExcelImportItem } from "../types";

export interface ParsedExcelRow extends ExcelImportItem {
  isValid: boolean;
  error?: string;
}

export interface ParseExcelResult {
  fileName: string;
  items: ParsedExcelRow[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  totalUnits: number;
  totalValueBeforeVat: number;
  totalValueAfterVat: number;
}

/**
 * Parses uploaded Excel (.xlsx, .xls) or CSV file matching the user template:
 * [ลำดับ, SKU, barcode, Brand, จำนวน, ราคาก่อนแวท, แวท, หลังแวท]
 */
export async function parseExcelFile(file: File): Promise<ParseExcelResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert worksheet to array of objects
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });

  const items: ParsedExcelRow[] = [];
  const nowIso = new Date().toISOString();

  let validCount = 0;
  let invalidCount = 0;
  let totalUnits = 0;
  let totalValPreVat = 0;
  let totalValPostVat = 0;

  rawRows.forEach((row, index) => {
    const lineNum = index + 1;

    // Flexible column resolution (case-insensitive & trimmed)
    const findVal = (keys: string[]): unknown => {
      for (const k of keys) {
        for (const rowKey of Object.keys(row)) {
          if (rowKey.trim().toLowerCase() === k.toLowerCase()) {
            return row[rowKey];
          }
        }
      }
      return "";
    };

    const rawSku = String(findVal(["SKU", "sku", "รหัสสินค้า", "รหัส SKU"])).trim();
    const rawBarcode = String(findVal(["barcode", "Barcode", "บาร์โค้ด"])).trim();
    const rawBrand = String(findVal(["Brand", "brand", "ยี่ห้อ", "ชื่อสินค้า", "Name", "Product Name"])).trim();
    const rawQty = findVal(["จำนวน", "Qty", "Quantity", "จำนวนชิ้น", "amount"]);
    const rawPreVat = findVal(["ราคาก่อนแวท", "ก่อนแวท", "ราคาต้นทุน", "UnitCost", "PriceBeforeVat", "ราคา"]);
    const rawVat = findVal(["แวท", "vat", "VAT", "ภาษีมูลค่าเพิ่ม"]);
    const rawPostVat = findVal(["หลังแวท", "ราคารวมแวท", "PriceAfterVat", "ราคาสุทธิ"]);
    const rawDate = findVal(["วันที่", "Date", "ReceivedDate", "datetime"]);

    // If completely empty row, skip
    if (!rawSku && !rawQty && !rawPreVat && !rawBrand) {
      return;
    }

    let error: string | undefined = undefined;

    // Validate SKU
    if (!rawSku) {
      error = i18n.t("excel.errSkuRequired");
    }

    // Validate Quantity
    const qtyNum = Number(rawQty);
    if (rawQty === "" || isNaN(qtyNum)) {
      error = error || i18n.t("excel.errQtyNumber");
    } else if (qtyNum <= 0) {
      error = error || i18n.t("excel.errQtyPositive");
    } else if (!Number.isInteger(qtyNum)) {
      error = error || i18n.t("excel.errQtyInteger", { qty: qtyNum });
    }

    // Validate Pre-VAT price
    const preVatNum = Number(rawPreVat);
    if (rawPreVat === "" || isNaN(preVatNum)) {
      error = error || i18n.t("excel.errPriceNumber");
    } else if (preVatNum < 0) {
      error = error || i18n.t("excel.errPricePositive");
    }

    // VAT & Post-VAT calculation
    const vatNum: number = isNaN(Number(rawVat)) || rawVat === "" ? +(preVatNum * 0.07).toFixed(2) : Number(rawVat);
    const postVatNum: number =
      isNaN(Number(rawPostVat)) || rawPostVat === "" ? +(preVatNum + vatNum).toFixed(2) : Number(rawPostVat);

    // If datetime is missing: "for import datetime if cannot find you can use datetime that import"
    let receivedDateStr = nowIso;
    if (rawDate) {
      try {
        const dateValue = typeof rawDate === "string" || typeof rawDate === "number" ? rawDate : String(rawDate);
        const d = new Date(dateValue);
        if (!isNaN(d.getTime())) {
          receivedDateStr = d.toISOString();
        }
      } catch {
        receivedDateStr = nowIso;
      }
    }

    const isValid = !error;
    if (isValid) {
      validCount++;
      totalUnits += qtyNum;
      totalValPreVat += qtyNum * preVatNum;
      totalValPostVat += qtyNum * postVatNum;
    } else {
      invalidCount++;
    }

    items.push({
      lineNumber: lineNum,
      sku: rawSku,
      barcode: rawBarcode || null,
      brand: rawBrand || rawSku,
      quantity: isValid ? qtyNum : 0,
      priceBeforeVat: isNaN(preVatNum) ? 0 : preVatNum,
      vat: vatNum,
      priceAfterVat: postVatNum,
      receivedDate: receivedDateStr,
      isValid,
      error,
    });
  });

  return {
    fileName: file.name,
    items,
    totalRows: items.length,
    validRows: validCount,
    invalidRows: invalidCount,
    totalUnits,
    totalValueBeforeVat: totalValPreVat,
    totalValueAfterVat: totalValPostVat,
  };
}

/**
 * Generates and downloads the standard Excel template matching the uploaded screenshot:
 * Columns: [ลำดับ, SKU, barcode, Brand, จำนวน, ราคาก่อนแวท, แวท, หลังแวท]
 */
export function downloadExcelTemplate() {
  const colSeq = i18n.t("excel.colSeq");
  const colSku = i18n.t("excel.colSku");
  const colBarcode = i18n.t("excel.colBarcode");
  const colBrand = i18n.t("excel.colBrand");
  const colQty = i18n.t("excel.colQty");
  const colPreVat = i18n.t("excel.colPreVat");
  const colVat = i18n.t("excel.colVat");
  const colPostVat = i18n.t("excel.colPostVat");

  const sampleData = [
    {
      [colSeq]: 1,
      [colSku]: "SKU-TECH-01",
      [colBarcode]: "885901234501",
      [colBrand]: "Logitech Wireless Mouse",
      [colQty]: 20,
      [colPreVat]: 350.0,
      [colVat]: 24.5,
      [colPostVat]: 374.5,
    },
    {
      [colSeq]: 2,
      [colSku]: "SKU-TECH-02",
      [colBarcode]: "885901234502",
      [colBrand]: "Keychron Mechanical Keyboard",
      [colQty]: 10,
      [colPreVat]: 1200.0,
      [colVat]: 84.0,
      [colPostVat]: 1284.0,
    },
    {
      [colSeq]: 3,
      [colSku]: "SKU-CAFE-01",
      [colBarcode]: "885901234503",
      [colBrand]: "Premium Arabica Roast 500g",
      [colQty]: 15,
      [colPreVat]: 220.0,
      [colVat]: 15.4,
      [colPostVat]: 235.4,
    },
    {
      [colSeq]: 4,
      [colSku]: "PRD-A001",
      [colBarcode]: "885000000001",
      [colBrand]: "Product A",
      [colQty]: 10,
      [colPreVat]: 5.0,
      [colVat]: 0.35,
      [colPostVat]: 5.35,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths for beautiful layout
  worksheet["!cols"] = [
    { wch: 8 }, // ลำดับ
    { wch: 18 }, // SKU
    { wch: 18 }, // barcode
    { wch: 30 }, // Brand
    { wch: 10 }, // จำนวน
    { wch: 15 }, // ราคาก่อนแวท
    { wch: 12 }, // แวท
    { wch: 15 }, // หลังแวท
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "StockPulse_Template");
  XLSX.writeFile(workbook, "StockPulse_Import_Template.xlsx");
}

export interface ExportReportOptions {
  title: string;
  reportType: "StockIn" | "StockOut" | "CurrentStock" | "All";
  dateRangeStr?: string;
  data: Array<{
    sku: string;
    barcode?: string | null;
    brand: string;
    quantity: number;
    priceBeforeVat: number;
    vat?: number | null;
    priceAfterVat?: number | null;
    date?: string;
    reference?: string;
    type?: string;
  }>;
}

/**
 * Exports data to an Excel report strictly formatted to the template in the user image:
 * [ลำดับ, SKU, barcode, Brand, จำนวน, ราคาก่อนแวท, แวท, หลังแวท]
 */
export function exportExcelReport(options: ExportReportOptions) {
  let totalQty = 0;
  let totalPreVat = 0;
  let totalVat = 0;
  let totalPostVat = 0;

  const rows = options.data.map((item, index) => {
    const qty = item.quantity;
    const preVat = item.priceBeforeVat;
    const vat = item.vat ?? +(preVat * 0.07).toFixed(2);
    const postVat = item.priceAfterVat ?? +(preVat + vat).toFixed(2);

    totalQty += qty;
    totalPreVat += qty * preVat;
    totalVat += qty * vat;
    totalPostVat += qty * postVat;

    const colSeq = i18n.t("excel.colSeq");
    const colSku = i18n.t("excel.colSku");
    const colBarcode = i18n.t("excel.colBarcode");
    const colBrand = i18n.t("excel.colBrand");
    const colQty = i18n.t("excel.colQty");
    const colPreVat = i18n.t("excel.colPreVat");
    const colVat = i18n.t("excel.colVat");
    const colPostVat = i18n.t("excel.colPostVat");

    return {
      [colSeq]: index + 1,
      [colSku]: item.sku,
      [colBarcode]: item.barcode || "-",
      [colBrand]: item.brand,
      [colQty]: qty,
      [colPreVat]: preVat,
      [colVat]: vat,
      [colPostVat]: postVat,
    };
  });

  const colSeq = i18n.t("excel.colSeq");
  const colSku = i18n.t("excel.colSku");
  const colBarcode = i18n.t("excel.colBarcode");
  const colBrand = i18n.t("excel.colBrand");
  const colQty = i18n.t("excel.colQty");
  const colPreVat = i18n.t("excel.colPreVat");
  const colVat = i18n.t("excel.colVat");
  const colPostVat = i18n.t("excel.colPostVat");

  // Summary footer row
  const summaryRow: Record<string, string | number> = {
    [colSeq]: i18n.t("excel.totalSummary"),
    [colSku]: i18n.t("excel.totalItems", { count: rows.length }),
    [colBarcode]: "",
    [colBrand]: "",
    [colQty]: totalQty,
    [colPreVat]: +totalPreVat.toFixed(2),
    [colVat]: +totalVat.toFixed(2),
    [colPostVat]: +totalPostVat.toFixed(2),
  };

  const finalData = [...rows, summaryRow];
  const worksheet = XLSX.utils.json_to_sheet(finalData);

  // Styling column widths
  worksheet["!cols"] = [
    { wch: 10 }, // ลำดับ
    { wch: 18 }, // SKU
    { wch: 18 }, // barcode
    { wch: 32 }, // Brand
    { wch: 12 }, // จำนวน
    { wch: 16 }, // ราคาก่อนแวท
    { wch: 14 }, // แวท
    { wch: 16 }, // หลังแวท
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

  const cleanDateRange = (options.dateRangeStr || "all").replace(/[\/\s:]+/g, "_");
  const fileName = `StockPulse_${options.reportType}_${cleanDateRange}.xlsx`;

  XLSX.writeFile(workbook, fileName);
}
