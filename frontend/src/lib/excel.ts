import * as XLSX from "xlsx";
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
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

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
    const findVal = (keys: string[]): any => {
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
      error = "กรุณาระบุรหัส SKU";
    }

    // Validate Quantity
    const qtyNum = Number(rawQty);
    if (rawQty === "" || isNaN(qtyNum)) {
      error = error || "กรุณาระบุจำนวนสินค้าเป็นตัวเลข";
    } else if (qtyNum <= 0) {
      error = error || "จำนวนสินค้าต้องมากกว่า 0 ชิ้น (ไม่สามารถใส่ 0 หรือติดลบได้)";
    } else if (!Number.isInteger(qtyNum)) {
      error = error || `จำนวนสินค้าต้องเป็นจำนวนเต็มเท่านั้น (พบ: ${qtyNum} ชิ้น)`;
    }

    // Validate Pre-VAT price
    const preVatNum = Number(rawPreVat);
    if (rawPreVat === "" || isNaN(preVatNum)) {
      error = error || "กรุณาระบุราคาก่อนแวทเป็นตัวเลข";
    } else if (preVatNum < 0) {
      error = error || "ราคาก่อนแวทต้องไม่ติดลบ";
    }

    // VAT & Post-VAT calculation
    let vatNum: number = isNaN(Number(rawVat)) || rawVat === "" ? +(preVatNum * 0.07).toFixed(2) : Number(rawVat);
    let postVatNum: number =
      isNaN(Number(rawPostVat)) || rawPostVat === "" ? +(preVatNum + vatNum).toFixed(2) : Number(rawPostVat);

    // If datetime is missing: "for import datetime if cannot find you can use datetime that import"
    let receivedDateStr = nowIso;
    if (rawDate) {
      try {
        const d = new Date(rawDate);
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
  const sampleData = [
    {
      ลำดับ: 1,
      SKU: "SKU-TECH-01",
      barcode: "885901234501",
      Brand: "Logitech Wireless Mouse",
      จำนวน: 20,
      ราคาก่อนแวท: 350.0,
      แวท: 24.5,
      หลังแวท: 374.5,
    },
    {
      ลำดับ: 2,
      SKU: "SKU-TECH-02",
      barcode: "885901234502",
      Brand: "Keychron Mechanical Keyboard",
      จำนวน: 10,
      ราคาก่อนแวท: 1200.0,
      แวท: 84.0,
      หลังแวท: 1284.0,
    },
    {
      ลำดับ: 3,
      SKU: "SKU-CAFE-01",
      barcode: "885901234503",
      Brand: "Premium Arabica Roast 500g",
      จำนวน: 15,
      ราคาก่อนแวท: 220.0,
      แวท: 15.4,
      หลังแวท: 235.4,
    },
    {
      ลำดับ: 4,
      SKU: "PRD-A001",
      barcode: "885000000001",
      Brand: "Product A",
      จำนวน: 10,
      ราคาก่อนแวท: 5.0,
      แวท: 0.35,
      หลังแวท: 5.35,
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

    return {
      ลำดับ: index + 1,
      SKU: item.sku,
      barcode: item.barcode || "-",
      Brand: item.brand,
      จำนวน: qty,
      ราคาก่อนแวท: preVat,
      แวท: vat,
      หลังแวท: postVat,
    };
  });

  // Summary footer row
  const summaryRow: any = {
    ลำดับ: "รวมทั้งสิ้น",
    SKU: `${rows.length} รายการ`,
    barcode: "",
    Brand: "",
    จำนวน: totalQty,
    ราคาก่อนแวท: +totalPreVat.toFixed(2),
    แวท: +totalVat.toFixed(2),
    หลังแวท: +totalPostVat.toFixed(2),
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
