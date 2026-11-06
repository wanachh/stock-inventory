import * as XLSX from "xlsx";
import i18n from "../i18n/config";
import { ExcelImportItem, ProductDetail } from "../types";

export interface ParsedExcelRow extends ExcelImportItem {
  name?: string | null;
  location?: string | null;
  isAutoSku?: boolean;
  movementType: "StockIn" | "StockOut" | "ZeroStock";
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
  totalUnitsIn: number;
  totalUnitsOut: number;
  zeroQtyCount: number;
  totalValueBeforeVat: number;
  totalValueAfterVat: number;
}

/**
 * Auto-generate machine-friendly SKU in web format PRD-YYYY-XXXX
 */
function generateRowSku(lineNum: number, existingSkus: Set<string>): string {
  const year = new Date().getFullYear();
  let candidate = "";
  let attempts = 0;
  do {
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    candidate = `PRD-${year}-${randomChars}`;
    attempts++;
  } while (existingSkus.has(candidate) && attempts < 100);

  if (existingSkus.has(candidate)) {
    candidate = `PRD-${year}-${String(lineNum).padStart(4, "0")}`;
  }

  existingSkus.add(candidate);
  return candidate;
}

/**
 * Parses uploaded Excel (.xlsx, .xls) or CSV file matching the user template:
 * [ลำดับ, SKU, barcode, Brand, ชื่อสินค้า, Location, จำนวน, ราคาก่อนแวท, แวท, หลังแวท]
 */
/**
 * Normalizes barcode values from Excel, converting potential scientific notation (e.g. 8.85E+12) to integer string
 */
function formatBarcodeString(val: unknown): string {
  if (val === null || val === undefined) return "";
  let s = String(val).trim();
  if (/^[+-]?\d+(\.\d+)?[eE][+-]?\d+$/.test(s)) {
    try {
      const num = Number(s);
      if (!isNaN(num) && Number.isFinite(num)) {
        s = BigInt(Math.round(num)).toString();
      }
    } catch {
      // Keep original string if BigInt fails
    }
  }
  return s;
}

/**
 * Parses uploaded Excel (.xlsx, .xls) or CSV file matching the user template:
 * [ลำดับ, SKU, barcode, Brand, ชื่อสินค้า, Location, จำนวน, ราคาก่อนแวท, แวท, หลังแวท]
 * Performs strict validation:
 * 1. Barcode is strictly required for all rows
 * 2. Location is strictly required (BT, EB, MT, WS - case-insensitive)
 * 3. If barcode exists in DB: Master fields (SKU, Name, Brand) if provided MUST match DB; if empty, auto-filled from DB
 * 4. If barcode is new: Name is strictly required, Stock Out not allowed, and in-file rows must be consistent
 */
export async function parseExcelFile(
  file: File,
  existingProducts?: ProductDetail[]
): Promise<ParseExcelResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert worksheet to array of objects
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });

  const items: ParsedExcelRow[] = [];
  const nowIso = new Date().toISOString();
  const usedSkus = new Set<string>();

  // Pre-index existing products by barcode and SKU (case-insensitive)
  const existingByBarcode = new Map<string, ProductDetail>();
  const existingBySku = new Map<string, ProductDetail>();
  if (existingProducts) {
    for (const p of existingProducts) {
      if (p.barcode) {
        existingByBarcode.set(p.barcode.trim().toLowerCase(), p);
      }
      if (p.sku) {
        existingBySku.set(p.sku.trim().toLowerCase(), p);
      }
    }
  }

  // In-memory cache for new barcodes appearing across multiple rows in the same file
  interface InFileBarcodeTracking {
    sku: string;
    name: string;
    brand?: string | null;
    firstLine: number;
  }
  const inMemoryNewBarcodes = new Map<string, InFileBarcodeTracking>();

  let validCount = 0;
  let invalidCount = 0;
  let totalUnitsIn = 0;
  let totalUnitsOut = 0;
  let zeroQtyCount = 0;
  let totalValPreVat = 0;
  let totalValPostVat = 0;

  const validLocations = ["BT", "EB", "MT", "WS"];

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

    const rawSku = String(findVal(["SKU", "sku", "รหัสสินค้า", "รหัส SKU", "รหัส"])).trim();
    const rawBarcode = formatBarcodeString(findVal(["barcode", "Barcode", "บาร์โค้ด"]));
    const rawBrand = String(findVal(["Brand", "brand", "ยี่ห้อ", "แบรนด์"])).trim();
    const rawName = String(findVal(["ชื่อสินค้า", "ชื่อ", "Name", "Product Name", "product_name", "รายการสินค้า", "สินค้า"])).trim();
    const rawLocation = String(findVal(["Location", "location", "คลัง", "คลังสินค้า", "สถานที่เก็บ"])).trim();
    const rawQty = findVal(["จำนวน", "Qty", "Quantity", "จำนวนชิ้น", "amount"]);
    const rawPreVat = findVal(["ราคาก่อนแวท", "ก่อนแวท", "ราคาต้นทุน", "UnitCost", "PriceBeforeVat", "ราคา"]);
    const rawVat = findVal(["แวท", "vat", "VAT", "ภาษีมูลค่าเพิ่ม"]);
    const rawPostVat = findVal(["หลังแวท", "ราคารวมแวท", "PriceAfterVat", "ราคาสุทธิ"]);
    const rawDate = findVal(["วันที่", "Date", "ReceivedDate", "datetime"]);

    // If completely empty row, skip
    if (!rawSku && !rawBarcode && !rawQty && !rawPreVat && !rawBrand && !rawName && !rawLocation) {
      return;
    }

    let error: string | undefined = undefined;
    let isAutoSku = false;

    // 1. Barcode Validation: Mandatory on every row
    if (!rawBarcode) {
      error = error || i18n.t("excel.errBarcodeRequired", { line: lineNum });
    }

    // 2. Location Validation: Mandatory and must be BT, EB, MT, or WS (case-insensitive)
    const locUpper = rawLocation.toUpperCase();
    if (!rawLocation) {
      error = error || i18n.t("excel.errLocationRequired", { line: lineNum });
    } else if (!validLocations.includes(locUpper)) {
      error = error || i18n.t("excel.errLocationInvalid", { line: lineNum, loc: rawLocation });
    }
    const finalLocation = validLocations.includes(locUpper) ? locUpper : (rawLocation || null);

    // 3. Quantity Validation: Allow 0 (Master only) and Negative (Stock Out)
    const qtyNum = Number(rawQty);
    let movementType: "StockIn" | "StockOut" | "ZeroStock" = "StockIn";

    if (rawQty === "" || isNaN(qtyNum)) {
      error = error || i18n.t("excel.errQtyNumber");
    } else if (!Number.isInteger(qtyNum)) {
      error = error || i18n.t("excel.errQtyInteger", { qty: qtyNum });
    } else if (qtyNum === 0) {
      movementType = "ZeroStock";
    } else if (qtyNum < 0) {
      movementType = "StockOut";
    } else {
      movementType = "StockIn";
    }

    // 4. Pre-VAT Price Validation
    const preVatNum = Number(rawPreVat);
    if (rawPreVat === "" || isNaN(preVatNum)) {
      error = error || i18n.t("excel.errPriceNumber");
    } else if (preVatNum < 0) {
      error = error || i18n.t("excel.errPricePositive");
    }

    // 5. Product & Barcode Matching (Strict DB Matching & Inheritance)
    let finalSku = rawSku;
    let finalName = rawName;
    let finalBrand = rawBrand || null;

    if (rawBarcode) {
      const barcodeKey = rawBarcode.toLowerCase();
      const dbProduct = existingByBarcode.get(barcodeKey);

      if (dbProduct) {
        // CASE A: Barcode already exists in DB
        // A.1 SKU check: If provided in Excel, must match DB SKU (case-insensitive)
        if (rawSku) {
          if (rawSku.toLowerCase() !== dbProduct.sku.toLowerCase()) {
            error = error || i18n.t("excel.errSkuMismatchDb", {
              line: lineNum,
              barcode: rawBarcode,
              dbSku: dbProduct.sku,
              excelSku: rawSku,
            });
          }
        }
        finalSku = dbProduct.sku; // Always adopt DB master SKU

        // A.2 Name check: If provided in Excel, must match DB Name (case-insensitive)
        if (rawName) {
          if (rawName.toLowerCase() !== dbProduct.name.toLowerCase()) {
            error = error || i18n.t("excel.errNameMismatchDb", {
              line: lineNum,
              barcode: rawBarcode,
              dbName: dbProduct.name,
              excelName: rawName,
            });
          }
        }
        finalName = dbProduct.name; // Always adopt DB master Name

        // A.3 Brand check: If provided in Excel and DB has brand, must match DB Brand
        if (rawBrand && dbProduct.brand) {
          if (rawBrand.toLowerCase() !== dbProduct.brand.toLowerCase()) {
            error = error || i18n.t("excel.errBrandMismatchDb", {
              line: lineNum,
              barcode: rawBarcode,
              dbBrand: dbProduct.brand,
              excelBrand: rawBrand,
            });
          }
        }
        finalBrand = dbProduct.brand || rawBrand || null;
      } else {
        // CASE B: New Barcode (Not found in DB)
        // B.1 Product Name is strictly required
        if (!rawName) {
          error = error || i18n.t("excel.errNewProductNameRequired", {
            line: lineNum,
            barcode: rawBarcode,
          });
        }

        // B.2 Cannot Stock Out a new product that doesn't exist in DB
        if (movementType === "StockOut") {
          error = error || i18n.t("excel.errCannotStockOutNewProduct", {
            line: lineNum,
            barcode: rawBarcode,
          });
        }

        // B.3 Check in-file memory cache for this new barcode
        const inMem = inMemoryNewBarcodes.get(barcodeKey);
        if (inMem) {
          // If seen earlier in the file, ensure name is consistent
          if (rawName && inMem.name && rawName.toLowerCase() !== inMem.name.toLowerCase()) {
            error = error || i18n.t("excel.errInFileNewBarcodeNameMismatch", {
              line: lineNum,
              barcode: rawBarcode,
              prevLine: inMem.firstLine,
            });
          }
          finalSku = inMem.sku;
          finalName = inMem.name;
          finalBrand = inMem.brand || rawBrand || null;
        } else {
          // First time this new barcode is seen
          if (rawSku) {
            const existingWithSku = existingBySku.get(rawSku.toLowerCase());
            if (existingWithSku) {
              error = error || i18n.t("excel.errSkuBelongsToOtherProduct", {
                line: lineNum,
                sku: rawSku,
              });
            }
            finalSku = rawSku.toUpperCase();
          } else {
            finalSku = generateRowSku(lineNum, usedSkus);
            isAutoSku = true;
          }

          inMemoryNewBarcodes.set(barcodeKey, {
            sku: finalSku,
            name: rawName,
            brand: rawBrand || null,
            firstLine: lineNum,
          });
        }
      }
    } else {
      // Row has no barcode - if SKU is also missing, auto-generate temporary identifier
      if (!finalSku) {
        finalSku = generateRowSku(lineNum, usedSkus);
        isAutoSku = true;
      }
    }

    usedSkus.add(finalSku.toUpperCase());

    // VAT & Post-VAT calculation
    const vatNum: number = isNaN(Number(rawVat)) || rawVat === "" ? +(preVatNum * 0.07).toFixed(2) : Number(rawVat);
    const postVatNum: number =
      isNaN(Number(rawPostVat)) || rawPostVat === "" ? +(preVatNum + vatNum).toFixed(2) : Number(rawPostVat);

    // Date resolution
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
      if (movementType === "StockIn") {
        totalUnitsIn += qtyNum;
        totalValPreVat += qtyNum * preVatNum;
        totalValPostVat += qtyNum * postVatNum;
      } else if (movementType === "StockOut") {
        totalUnitsOut += Math.abs(qtyNum);
      } else {
        zeroQtyCount++;
      }
    } else {
      invalidCount++;
    }

    items.push({
      lineNumber: lineNum,
      sku: finalSku,
      barcode: rawBarcode || null,
      name: finalName || rawName || null,
      brand: finalBrand,
      location: finalLocation,
      quantity: isValid ? qtyNum : 0,
      priceBeforeVat: isNaN(preVatNum) ? 0 : preVatNum,
      vat: vatNum,
      priceAfterVat: postVatNum,
      receivedDate: receivedDateStr,
      isAutoSku,
      movementType,
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
    totalUnits: totalUnitsIn + totalUnitsOut,
    totalUnitsIn,
    totalUnitsOut,
    zeroQtyCount,
    totalValueBeforeVat: totalValPreVat,
    totalValueAfterVat: totalValPostVat,
  };
}

/**
 * Generates and downloads the standard Excel template matching the warehouse and product structure:
 * Columns: [ลำดับ, SKU, Barcode, Brand, ชื่อสินค้า, Location, จำนวน, ราคาก่อนแวท, แวท, หลังแวท]
 */
export function downloadExcelTemplate() {
  const colSeq = i18n.t("excel.colSeq");
  const colSku = i18n.t("excel.colSku");
  const colBarcode = i18n.t("excel.colBarcode");
  const colBrand = i18n.t("excel.colBrand");
  const colName = i18n.t("excel.colName");
  const colLocation = i18n.t("excel.colLocation");
  const colQty = i18n.t("excel.colQty");
  const colPreVat = i18n.t("excel.colPreVat");
  const colVat = i18n.t("excel.colVat");
  const colPostVat = i18n.t("excel.colPostVat");

  const sampleData = [
    {
      [colSeq]: 1,
      [colSku]: "SKU-HINCE-01",
      [colBarcode]: "8809642481954",
      [colBrand]: "HINCE",
      [colName]: "Mood Enhancer Water Liquid Glow 4g W001 New Allure",
      [colLocation]: "BT",
      [colQty]: 20,
      [colPreVat]: 575.7,
      [colVat]: 40.3,
      [colPostVat]: 616.0,
    },
    {
      [colSeq]: 2,
      [colSku]: "SKU-HINCE-02",
      [colBarcode]: "8809642481961",
      [colBrand]: "HINCE",
      [colName]: "Mood Enhancer Water Liquid Glow 4g W002 Borderless",
      [colLocation]: "EB",
      [colQty]: 15,
      [colPreVat]: 575.7,
      [colVat]: 40.3,
      [colPostVat]: 616.0,
    },
    {
      [colSeq]: 3,
      [colSku]: "SKU-TECH-01",
      [colBarcode]: "885901234501",
      [colBrand]: "Logitech",
      [colName]: "Wireless Mouse M185",
      [colLocation]: "MT",
      [colQty]: 30,
      [colPreVat]: 350.0,
      [colVat]: 24.5,
      [colPostVat]: 374.5,
    },
    {
      [colSeq]: 4,
      [colSku]: "", // Test empty SKU -> will be auto-generated as PRD-YYYY-XXXX
      [colBarcode]: "885901234502",
      [colBrand]: "Keychron",
      [colName]: "Mechanical Keyboard K2",
      [colLocation]: "WS",
      [colQty]: -5, // Test Stock Out -> deduct 5 pcs via FIFO
      [colPreVat]: 1200.0,
      [colVat]: 84.0,
      [colPostVat]: 1284.0,
    },
    {
      [colSeq]: 5,
      [colSku]: "PRD-MASTER-01",
      [colBarcode]: "885000000001",
      [colBrand]: "General",
      [colName]: "Sample Product Master (0 Stock)",
      [colLocation]: "BT",
      [colQty]: 0, // Test 0 Quantity -> register product into catalog
      [colPreVat]: 100.0,
      [colVat]: 7.0,
      [colPostVat]: 107.0,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths for optimal layout
  worksheet["!cols"] = [
    { wch: 8 }, // ลำดับ
    { wch: 18 }, // SKU
    { wch: 18 }, // Barcode
    { wch: 16 }, // Brand
    { wch: 40 }, // ชื่อสินค้า
    { wch: 14 }, // Location
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
    brand?: string | null;
    name?: string | null;
    location?: string | null;
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
 * Exports data to an Excel report with separated Brand, Name, and Location
 */
export function exportExcelReport(options: ExportReportOptions) {
  let totalQty = 0;
  let totalPreVat = 0;
  let totalVat = 0;
  let totalPostVat = 0;

  const colSeq = i18n.t("excel.colSeq");
  const colSku = i18n.t("excel.colSku");
  const colBarcode = i18n.t("excel.colBarcode");
  const colBrand = i18n.t("excel.colBrand");
  const colName = i18n.t("excel.colName");
  const colLocation = i18n.t("excel.colLocation");
  const colQty = i18n.t("excel.colQty");
  const colPreVat = i18n.t("excel.colPreVat");
  const colVat = i18n.t("excel.colVat");
  const colPostVat = i18n.t("excel.colPostVat");

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
      [colSeq]: index + 1,
      [colSku]: item.sku,
      [colBarcode]: item.barcode || "-",
      [colBrand]: item.brand || "-",
      [colName]: item.name || "-",
      [colLocation]: item.location || "BT",
      [colQty]: qty,
      [colPreVat]: preVat,
      [colVat]: vat,
      [colPostVat]: postVat,
    };
  });

  // Summary footer row
  const summaryRow: Record<string, string | number> = {
    [colSeq]: i18n.t("excel.totalSummary"),
    [colSku]: i18n.t("excel.totalItems", { count: rows.length }),
    [colBarcode]: "",
    [colBrand]: "",
    [colName]: "",
    [colLocation]: "",
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
    { wch: 18 }, // Brand
    { wch: 36 }, // Name
    { wch: 12 }, // Location
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
