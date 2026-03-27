const XLSX = require("../web/node_modules/xlsx");
const fs = require("fs");
const path = require("path");

const wb = XLSX.readFile("C:/Users/otavi/Downloads/CBHPM-2022.xlsx");
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

function esc(v) {
  if (v === null || v === undefined || v === "") return "NULL";
  return "'" + String(v).replace(/'/g, "''") + "'";
}

let sql = "";

sql += "-- Migration: CBHPM 2022 procedimentos table\n";
sql += "-- Generated from CBHPM-2022.xlsx\n\n";

sql += "CREATE TABLE IF NOT EXISTS public.cbhpm_procedimentos (\n";
sql += "  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n";
sql += "  codigo text NOT NULL UNIQUE,\n";
sql += "  descricao text NOT NULL,\n";
sql += "  porte text,\n";
sql += "  porte_anestesico text,\n";
sql += "  grupo_id text,\n";
sql += "  grupo_nome text,\n";
sql += "  subgrupo_id text,\n";
sql += "  subgrupo_nome text,\n";
sql += "  created_at timestamptz NOT NULL DEFAULT now()\n";
sql += ");\n\n";

sql += "ALTER TABLE public.cbhpm_procedimentos ENABLE ROW LEVEL SECURITY;\n\n";

sql += "DROP POLICY IF EXISTS cbhpm_select ON public.cbhpm_procedimentos;\n";
sql += "CREATE POLICY cbhpm_select ON public.cbhpm_procedimentos\n";
sql += "  FOR SELECT TO authenticated USING (true);\n\n";

sql += "-- Add CBHPM reference columns to procedimentos\n";
sql += "ALTER TABLE public.procedimentos ADD COLUMN IF NOT EXISTS codigo_cbhpm text;\n";
sql += "ALTER TABLE public.procedimentos ADD COLUMN IF NOT EXISTS porte_anestesico text;\n\n";

const batchSize = 100;
let inserted = 0;

for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  const codigo = r[4];
  const descricao = r[5];
  if (!codigo || !descricao) continue;

  if (inserted % batchSize === 0) {
    if (inserted > 0) sql += ";\n\n";
    sql +=
      "INSERT INTO public.cbhpm_procedimentos (codigo, descricao, porte, porte_anestesico, grupo_id, grupo_nome, subgrupo_id, subgrupo_nome) VALUES\n";
  } else {
    sql += ",\n";
  }

  sql +=
    "(" +
    [
      esc(String(codigo)),
      esc(descricao),
      esc(r[7] || null),
      esc(r[10] || null),
      esc(r[0] || null),
      esc(r[1] || null),
      esc(r[2] || null),
      esc(r[3] || null),
    ].join(", ") +
    ")";
  inserted++;
}
sql += ";\n\n";
sql += "-- Total: " + inserted + " procedures inserted\n";

const outPath = path.resolve(
  __dirname,
  "../supabase/migrations/202603060500_cbhpm_2022.sql"
);
fs.writeFileSync(outPath, sql, "utf8");
console.log("Generated SQL with " + inserted + " rows at " + outPath);
