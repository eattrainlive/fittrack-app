#!/usr/bin/env python3
"""Convert an Evolt 'Result Activity Report' (xlsx or csv) into upsert SQL for
the evolt_scans table. Re-running the same export never duplicates (keyed by
scan ID). Usage: python3 evolt_import.py <export.xlsx> > evolt_import.sql
Handles the full 2020->now dump the same way as a single weekly file."""
import sys, json, datetime

COLMAP = {
    "ID":"id","Date":"scan_at","First Name":"first_name","Last Name":"last_name",
    "Email":"email","Mobile":"mobile","Gender":"gender","Age":"age","Location":"location",
    "Height":"height","Weight":"weight","Percent Body Fat":"body_fat_pct","BWI ®":"bwi",
    "Bio Age":"bio_age","BMI":"bmi","L.B.M":"lbm","S.M.M":"smm","S.M.M Rating":"smm_rating",
    "Mineral":"mineral","Protein":"protein","W.H.R":"whr","T.B.W":"tbw","A.C":"ac",
    "Body Fat":"body_fat","Subcutaneous Fat":"subcutaneous_fat","Visceral Fat":"visceral_fat",
    "Visceral Fat Area":"visceral_fat_area","Systolic":"systolic","Diastolic":"diastolic","Pulse":"pulse",
}
NUM = {"age","height","weight","body_fat_pct","bwi","bio_age","bmi","lbm","smm","mineral",
       "protein","whr","tbw","ac","body_fat","subcutaneous_fat","visceral_fat","visceral_fat_area",
       "systolic","diastolic","pulse"}

def rows_from(path):
    if path.lower().endswith(".csv"):
        import csv
        with open(path, newline="", encoding="utf-8-sig") as f:
            return [list(r) for r in csv.reader(f)]
    import openpyxl
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb[wb.sheetnames[0]]
    return [list(r) for r in ws.iter_rows(values_only=True)]

def parse_date(s):
    if not s: return None
    s=str(s).strip()
    for fmt in ("%d/%m/%Y %I:%M:%S %p","%d/%m/%Y %H:%M:%S","%d/%m/%Y","%Y-%m-%d %H:%M:%S","%Y-%m-%d"):
        try: return datetime.datetime.strptime(s,fmt).strftime("%Y-%m-%d %H:%M:%S")
        except ValueError: pass
    return None

def q(v):
    if v is None or v=="" : return "null"
    return "'" + str(v).replace("'","''") + "'"

def num(v):
    if v in (None,""): return "null"
    try: return str(float(v))
    except (ValueError,TypeError): return "null"

def main(path):
    rows = rows_from(path)
    hdr = [str(c).strip() if c is not None else "" for c in rows[0]]
    cols = ["id","scan_at","email","mobile","first_name","last_name","gender","age","location",
            "height","weight","body_fat_pct","bmi","bio_age","bwi","lbm","smm","smm_rating","mineral",
            "protein","whr","tbw","ac","body_fat","subcutaneous_fat","visceral_fat","visceral_fat_area",
            "systolic","diastolic","pulse","raw"]
    out=[]; n=0
    for r in rows[1:]:
        rec={}
        raw={}
        for h,v in zip(hdr,r):
            if h in COLMAP: rec[COLMAP[h]]=v
            if h: raw[h]= (v if not isinstance(v,datetime.datetime) else str(v))
        if not rec.get("id"): continue
        rec["scan_at"]=parse_date(rec.get("scan_at"))
        if rec.get("email"): rec["email"]=str(rec["email"]).strip().lower()
        vals=[]
        for c in cols:
            if c=="raw": vals.append("'"+json.dumps(raw).replace("'","''")+"'::jsonb")
            elif c in NUM: vals.append(num(rec.get(c)))
            elif c=="scan_at": vals.append(q(rec.get("scan_at")))
            else: vals.append(q(rec.get(c)))
        out.append("("+",".join(vals)+")"); n+=1
    print("-- Evolt import: %d scans from %s" % (n, path.split('/')[-1]))
    print("insert into public.evolt_scans (%s) values" % ",".join(cols))
    print(",\n".join(out))
    upd=",".join("%s=excluded.%s"%(c,c) for c in cols if c!="id")
    print("on conflict (id) do update set "+upd+";")

if __name__=="__main__":
    main(sys.argv[1])
