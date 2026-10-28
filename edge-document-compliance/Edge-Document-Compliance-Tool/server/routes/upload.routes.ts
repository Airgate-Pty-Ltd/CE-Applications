import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import pdfParse from "pdf-parse";
import ExcelJS from "exceljs";
import { Pool } from "pg";

const router = Router();
const upload = multer({ dest: "tmp/" });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function sha256(buf: Buffer) { return crypto.createHash("sha256").update(buf).digest("hex"); }

router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "NO_FILE" });

    const file = req.file;
    const storageDir = "data/uploads";
    fs.mkdirSync(storageDir, { recursive: true });
    const targetPath = path.join(storageDir, file.filename + "_" + file.originalname);
    fs.renameSync(file.path, targetPath);

    const raw = fs.readFileSync(targetPath);
    const checksum = sha256(raw);

    let parsed_text: string | null = null;
    let parsed_json: any = null;

    if (/pdf$/i.test(file.originalname)) {
      const parsed = await pdfParse(raw);
      parsed_text = parsed.text;
    } else if (/xlsx|xls|csv$/i.test(file.originalname)) {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(targetPath);
      parsed_json = {};
      wb.eachSheet((ws) => {
        const rows: any[] = [];
        ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
          rows.push(row.values.map((v: any)=> (typeof v === "object" && v && v.text) ? v.text : v));
        });
        parsed_json[ws.name] = rows;
      });
    } else if (/docx$/i.test(file.originalname)) {
      parsed_text = "[DOCX parsing placeholder] Please integrate a docx text extractor if needed.";
    } else if (/txt$/i.test(file.originalname)) {
      parsed_text = raw.toString("utf8");
    }

    const r = await pool.query(
      `insert into edcat.uploaded_files(filename, mimetype, size_bytes, storage_path, parsed_json, parsed_text, checksum)
       values ($1,$2,$3,$4,$5,$6,$7)
       returning id`,
      [file.originalname, file.mimetype, file.size, targetPath, parsed_json, parsed_text, checksum]
    );

    res.json({ success: true, id: r.rows[0].id, filename: file.originalname });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || String(e) });
  }
});

export default router;

