import pyodbc
pyodbc.pooling = False
import psycopg2
from psycopg2.extras import execute_values
import time
import os
import shutil
import socket
import threading
import urllib.request
import json
import tempfile
import uuid

# --- CONFIGURATION ---
# Network path to the live backend database on the server
# Using mapped drive letter Z: (more reliable with Access ODBC driver under Administrator)
# To map: run this in Admin terminal: net use Z: \\192.168.12.250\Agenda_Vendita
BACKEND_NETWORK_PATH = r"Z:\Gestione VN2_be.accdb"
BACKEND_NETWORK_UNC  = r"\\192.168.12.250\Agenda_Vendita\Gestione VN2_be.accdb"

# Local fallback path to the backend database (for development or local testing)
BACKEND_LOCAL_PATH   = r"C:\Users\Public\Documents\Agenda Vendita\Gestione VN2_be.accdb"

# PostgreSQL credentials
PG_HOST = "127.0.0.1" 
PG_PORT = "5432"
PG_DATABASE = "postgres"
PG_USER = "postgres"
PG_PASSWORD = "postgres"

PG_CONN_STR = f"host={PG_HOST} port={PG_PORT} dbname={PG_DATABASE} user={PG_USER} password={PG_PASSWORD}"

def check_network_host(host, port=445, timeout=1.0):
    """Performs a quick socket connection check to prevent network hang/blocking."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception:
        return False



def parse_date_val(val):
    if not val:
        return None
    from datetime import datetime, date
    if isinstance(val, datetime):
        return val
    if isinstance(val, date):
        return datetime(val.year, val.month, val.day)
    
    s_val = str(val).strip()
    if not s_val or s_val.lower() in ('none', 'null'):
        return None
        
    formats = [
        '%d/%m/%Y',
        '%d/%m/%y',
        '%Y-%m-%d',
        '%Y/%m/%d',
        '%d-%m-%Y',
        '%d-%m-%y',
        '%d.%m.%Y',
        '%d.%m.%y',
        '%Y-%m-%d %H:%M:%S',
        '%d/%m/%Y %H:%M:%S',
        '%d/%m/%Y %H:%M',
        '%Y-%m-%dT%H:%M:%S',
    ]
    for fmt in formats:
        try:
            return datetime.strptime(s_val, fmt)
        except ValueError:
            continue
            
    try:
        s_clean = s_val.split('.')[0].replace('T', ' ')
        for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d'):
            try:
                return datetime.strptime(s_clean, fmt)
            except ValueError:
                continue
    except Exception:
        pass
        
    return None

def copy_locked_file(src_path, dst_path):
    """Copies a file on Windows using Win32 API shared read flags, even if open and locked exclusively by MS Access."""
    import ctypes
    from ctypes import wintypes
    try:
        kernel32 = ctypes.windll.kernel32
        GENERIC_READ = 0x80000000
        FILE_SHARE_READ = 0x00000001
        FILE_SHARE_WRITE = 0x00000002
        FILE_SHARE_DELETE = 0x00000004
        OPEN_EXISTING = 3
        FILE_ATTRIBUTE_NORMAL = 0x80

        kernel32.CreateFileW.restype = wintypes.HANDLE
        kernel32.CreateFileW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, wintypes.LPVOID, wintypes.DWORD, wintypes.DWORD, wintypes.HANDLE]
        kernel32.ReadFile.argtypes = [wintypes.HANDLE, wintypes.LPVOID, wintypes.DWORD, ctypes.POINTER(wintypes.DWORD), wintypes.LPVOID]
        kernel32.CloseHandle.argtypes = [wintypes.HANDLE]

        handle = kernel32.CreateFileW(
            src_path,
            GENERIC_READ,
            FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
            None,
            OPEN_EXISTING,
            FILE_ATTRIBUTE_NORMAL,
            None
        )
        INVALID_HANDLE_VALUE = wintypes.HANDLE(-1).value
        if handle == INVALID_HANDLE_VALUE or handle == 0:
            shutil.copy2(src_path, dst_path)
            return True

        with open(dst_path, 'wb') as dst:
            buf_size = 64 * 1024
            buf = ctypes.create_string_buffer(buf_size)
            bytes_read = wintypes.DWORD()
            while True:
                res = kernel32.ReadFile(handle, buf, buf_size, ctypes.byref(bytes_read), None)
                if not res or bytes_read.value == 0:
                    break
                dst.write(buf.raw[:bytes_read.value])
        kernel32.CloseHandle(handle)
        time.sleep(0.2)
        return True
    except Exception as e:
        print(f"[Sync] copy_locked_file error: {e}")
        try:
            shutil.copy2(src_path, dst_path)
            return True
        except Exception as e2:
            print(f"[Sync] shutil.copy2 fallback error: {e2}")
            return False

def fetch_access_data(db_path):
    """Reads data from the specified MS Access database file, copying locally if local, or connecting directly if UNC network path."""
    temp_path = os.path.abspath("temp_sync.accdb")
    is_temp = False
    conn_path = db_path
    
    if copy_locked_file(db_path, temp_path):
        conn_path = temp_path
        is_temp = True
    else:
        print(f"Warning: Could not copy Access DB ({db_path}) to temp file. Connecting directly...")
        conn_path = db_path
        
    conn = None
    cursor = None
    try:
        conn_str = f"DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={conn_path};ReadOnly=1;"
        conn = pyodbc.connect(conn_str, autocommit=True)
        cursor = conn.cursor()
        
        # Check if table 'Appuntamenti' exists in Access
        tables = [t.table_name.lower() for t in cursor.tables(tableType='TABLE')]
        use_appuntamenti = 'appuntamenti' in tables
        
        data = []
        if use_appuntamenti:
            print("[Sync] Found new Appuntamenti table. Querying it directly...")
            
            # Run a lightweight query to inspect column names from description safely
            cursor.execute("SELECT TOP 1 * FROM [Appuntamenti]")
            columns = [col[0] for col in cursor.description]
            
            note_col = None
            for col in columns:
                c_lower = col.lower()
                if 'note' in c_lower or 'nota' in c_lower or 'istruzioni' in c_lower or 'instruction' in c_lower:
                    note_col = col
                    break
                    
            cancel_col = None
            for col in columns:
                c_lower = col.lower()
                if 'annull' in c_lower or 'cancell' in c_lower or 'cancel' in c_lower or 'elimina' in c_lower:
                    cancel_col = col
                    break

            tipo_col = None
            for col in columns:
                c_lower = col.lower()
                if c_lower == 'tipo' or 'tipologia' in c_lower or c_lower == 'tipoappuntamento' or c_lower == 'type':
                    tipo_col = col
                    break
            
            date_col = None
            for col in columns:
                c_lower = col.lower()
                if 'appunt' in c_lower or 'data' in c_lower or 'giorno' in c_lower or 'date' in c_lower:
                    date_col = col
                    break
            if not date_col:
                date_col = "AppuntVendita"

            time_col = None
            for col in columns:
                c_lower = col.lower()
                if 'fascia' in c_lower or 'ora' in c_lower or 'time' in c_lower:
                    time_col = col
                    break
            if not time_col:
                time_col = "FasciaOrariaVendita"

            select_cols = ["Indice", "Cliente", "Venditore", f"[{date_col}]", f"[{time_col}]"]
            if note_col:
                select_cols.append(f"[{note_col}]")
            if cancel_col:
                select_cols.append(f"[{cancel_col}]")
            if tipo_col:
                select_cols.append(f"[{tipo_col}]")
                
            query = f"SELECT {', '.join(select_cols)} FROM [Appuntamenti] WHERE Indice IS NOT NULL;"
            cursor.execute(query)
            rows = cursor.fetchall()
            
            for row in rows:
                interno = str(row[0]).strip() if row[0] is not None else None
                cliente = row[1].strip() if row[1] else None
                venditore = row[2].strip() if row[2] else None
                date_val = row[3]
                time_str = str(row[4]).strip() if row[4] is not None else ""
                luogo = None
                
                note = None
                cancellato = False
                tipo = None
                
                current_idx = 5
                if note_col:
                    note = str(row[current_idx]).strip() if row[current_idx] is not None else None
                    current_idx += 1
                if cancel_col:
                    val = row[current_idx]
                    if isinstance(val, bool):
                        cancellato = val
                    elif isinstance(val, (int, float)):
                        cancellato = (val != 0)
                    elif val is not None:
                        s = str(val).strip().lower()
                        cancellato = s in ('true', 'yes', 'si', '-1', '1', '-1.0', '1.0', 'checked')
                    current_idx += 1
                if tipo_col:
                    tipo = str(row[current_idx]).strip() if row[current_idx] is not None else None
                
                # Combine Date and Time
                data_ora = None
                dt = parse_date_val(date_val)
                if dt:
                    hour, minute = 0, 0
                    if time_str:
                        start_time = time_str.split('-')[0].split('to')[0].split('a')[0].strip()
                        cleaned_time = start_time.replace('.', ':').replace(' ', '')
                        try:
                            if ':' in cleaned_time:
                                t_parts = cleaned_time.split(':')
                                hour = int(t_parts[0])
                                minute = int(t_parts[1]) if len(t_parts) > 1 else 0
                            else:
                                hour = int(cleaned_time)
                        except ValueError:
                            pass
                    try:
                        data_ora = dt.replace(hour=hour, minute=minute, second=0, microsecond=0)
                    except ValueError:
                        data_ora = dt
                            
                # Form a unique identifier combining Indice, Date, and Time to handle duplicate Indices
                interno_raw = str(row[0]).strip() if row[0] is not None else "NO_INDEX"
                date_str_key = data_ora.strftime('%Y%m%d%H%M') if data_ora else "NO_DATE"
                venditore_key = (venditore or "NO_VEND").upper()
                interno = f"{interno_raw}_{date_str_key}_{venditore_key}"
                
                data.append((interno, cliente, venditore, data_ora, luogo, note, cancellato, tipo))
        else:
            print("[Sync] Appuntamenti table not found. Using fallback Database1 table...")
            # Try querying with [Sede], [Data fatturazione CE], [Testo3]
            has_sede = False
            try:
                query = """
                    SELECT Interno, Cliente, Venditore, [Data contratto], [indirizzo], [Residente a], [Sede], [Data fatturazione CE], [Testo3]
                    FROM [Database1]
                    WHERE Interno IS NOT NULL;
                """
                cursor.execute(query)
                has_sede = True
            except Exception:
                query = """
                    SELECT Interno, Cliente, Venditore, [Data contratto], [indirizzo], [Residente a], [Data fatturazione CE], [Testo3]
                    FROM [Database1]
                    WHERE Interno IS NOT NULL;
                """
                cursor.execute(query)
                has_sede = False
                
            rows = cursor.fetchall()
            for row in rows:
                interno = str(row[0]).strip() if row[0] is not None else None
                cliente = row[1].strip() if row[1] else None
                venditore = row[2].strip() if row[2] else None
                
                address = row[4].strip() if row[4] else ""
                city = row[5].strip() if row[5] else ""
                
                if has_sede:
                    sede = row[6].strip() if row[6] else ""
                    date_val = row[7] if row[7] is not None else row[3]
                    time_str = str(row[8]).strip() if row[8] is not None else ""
                else:
                    sede = ""
                    date_val = row[6] if row[6] is not None else row[3]
                    time_str = str(row[7]).strip() if row[7] is not None else ""
                    
                parts = [p for p in [sede, address, city] if p]
                luogo = " - ".join(parts) if parts else None
                
                # Combine Date and Time
                data_ora = None
                dt = parse_date_val(date_val)
                if dt:
                    hour, minute = 0, 0
                    if time_str:
                        start_time = time_str.split('-')[0].split('to')[0].split('a')[0].strip()
                        cleaned_time = start_time.replace('.', ':').replace(' ', '')
                        try:
                            if ':' in cleaned_time:
                                t_parts = cleaned_time.split(':')
                                hour = int(t_parts[0])
                                minute = int(t_parts[1]) if len(t_parts) > 1 else 0
                            else:
                                hour = int(cleaned_time)
                        except ValueError:
                            pass
                    try:
                        data_ora = dt.replace(hour=hour, minute=minute, second=0, microsecond=0)
                    except ValueError:
                        data_ora = dt
                
                # Form a unique identifier combining Interno, Date, and Time to handle duplicates
                interno_raw = str(row[0]).strip() if row[0] is not None else "NO_INDEX"
                date_str_key = data_ora.strftime('%Y%m%d%H%M') if data_ora else "NO_DATE"
                venditore_key = (venditore or "NO_VEND").upper()
                interno = f"{interno_raw}_{date_str_key}_{venditore_key}"
                
                data.append((interno, cliente, venditore, data_ora, luogo, None, False, None))
        return data
    except Exception as e:
        print(f"Error connecting or reading Access DB ({os.path.basename(db_path)}): {e}")
        return []
    finally:
        if conn:
            try:
                if cursor:
                    cursor.close()
            except Exception:
                pass
            try:
                conn.close()
            except Exception:
                pass
        # Give the OS a split second to release file handles
        time.sleep(0.5)
        # Clean up the temporary file if created
        if is_temp and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as rm_err:
                print(f"Warning: Could not remove temporary file {temp_path}: {rm_err}")

def upsert_to_postgresql(data):
    """Inserts new or updates existing records in PostgreSQL."""
    if not data:
        return
        
    # Deduplicate data by intorno (first element of tuple) to avoid postgres ON CONFLICT error
    dedup_dict = {}
    for item in data:
        intorno = item[0]
        if intorno:
            dedup_dict[intorno] = item
    deduplicated_data = list(dedup_dict.values())
    
    pg_conn = None
    try:
        upsert_query = """
            INSERT INTO public.appointments (intorno, cliente, venditore, data_ora, luogo, note, cancellato, tipo)
            VALUES %s
            ON CONFLICT (intorno) 
            DO UPDATE SET 
                cliente = EXCLUDED.cliente,
                venditore = EXCLUDED.venditore,
                data_ora = EXCLUDED.data_ora,
                luogo = EXCLUDED.luogo,
                note = EXCLUDED.note,
                cancellato = EXCLUDED.cancellato,
                tipo = EXCLUDED.tipo,
                last_sync = CURRENT_TIMESTAMP;
        """

        pg_conn = psycopg2.connect(PG_CONN_STR)
        cursor = pg_conn.cursor()
        
        execute_values(cursor, upsert_query, deduplicated_data)
        pg_conn.commit()
        print(f"[OK] Successfully synced {len(deduplicated_data)} unique records to local PostgreSQL.")

        # Push synced records directly to Render live cloud database
        try:
            import json
            payload_appts = []
            for item in deduplicated_data:
                # item: (intorno, cliente, venditore, data_ora, luogo, note, cancellato, tipo)
                d_ora = item[3].isoformat() if item[3] else None
                payload_appts.append({
                    "intorno": str(item[0]),
                    "cliente": item[1],
                    "venditore": item[2],
                    "data_ora": d_ora,
                    "luogo": item[4],
                    "note": item[5],
                    "cancellato": bool(item[6]) if item[6] is not None else False,
                    "tipo": item[7]
                })

            req_data = json.dumps({"appointments": payload_appts}).encode('utf-8')
            render_req = urllib.request.Request(
                'https://rossomandi-backend.onrender.com/api/sync/push-appointments',
                data=req_data,
                headers={
                    'Content-Type': 'application/json',
                    'x-sync-key': 'rossomandi_secret_sync_2026'
                },
                method='POST'
            )
            with urllib.request.urlopen(render_req, timeout=30) as resp:
                print(f"[LIVE RENDER CLOUD SYNC] Successfully synced {len(payload_appts)} records directly to Render Cloud DB! (HTTP {resp.status})", flush=True)
        except Exception as render_err:
            print(f"[LIVE RENDER CLOUD SYNC WARNING] Cloud sync notice: {render_err}", flush=True)

    except Exception as e:
        print(f"Error writing to PostgreSQL: {e}")
        if pg_conn:
            pg_conn.rollback()
    finally:
        if pg_conn:
            pg_conn.close()

def fetch_stock_usato_data(db_path):
    """Connects to Access DB and fetches all rows from StockUsato table safely."""
    temp_path = os.path.abspath("temp_stock_sync.accdb")
    conn_path = db_path
    if copy_locked_file(db_path, temp_path):
        conn_path = temp_path

    conn = None
    cursor = None
    try:
        rows = []
        col_names = []
        try:
            conn_str = f"DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={conn_path};ReadOnly=1;"
            conn = pyodbc.connect(conn_str, autocommit=True)
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM StockUsato")
            col_names = [col[0].lower() for col in cursor.description]
            rows = cursor.fetchall()
        except Exception as direct_e:
            print(f"[StockUsato Direct Conn Notice] {direct_e}", flush=True)

        print(f"[StockUsato] Successfully queried StockUsato table! Columns: {col_names}", flush=True)
        print(f"[StockUsato Debug] Total rows read from table: {len(rows)}", flush=True)

        def get_val(row, col_map, key_names):
            for kn in key_names:
                kn_clean = kn.lower()
                for cname, idx in col_map.items():
                    if kn_clean in cname:
                        return row[idx]
            return None

        col_map = {name: i for i, name in enumerate(col_names)}

        data = []
        for row in rows:
            try:
                raw_indice = get_val(row, col_map, ["indice", "id"])
                if raw_indice is None:
                    continue
                indice = int(raw_indice)

                targa = str(get_val(row, col_map, ["targa"]) or "").strip()
                marca = str(get_val(row, col_map, ["marca"]) or "").strip()
                versione = str(get_val(row, col_map, ["versione"]) or "").strip()
                
                raw_date = get_val(row, col_map, ["immatricolazione", "data"])
                dt_val = parse_date_val(raw_date)
                
                raw_km = get_val(row, col_map, ["km", "chilometr"])
                km_val = 0
                if raw_km is not None:
                    try:
                        km_val = int(float(str(raw_km).replace('.', '').replace(',', '.').strip()))
                    except ValueError:
                        km_val = 0
                        
                colore = str(get_val(row, col_map, ["colore"]) or "").strip()
                carburante = str(get_val(row, col_map, ["carburante"]) or "").strip()
                cambio = str(get_val(row, col_map, ["cambio"]) or "").strip()

                def format_access_price(val):
                    if val is None or str(val).strip() == '' or str(val).strip() == 'None':
                        return ''
                    try:
                        from decimal import Decimal
                        if isinstance(val, (int, float, Decimal)):
                            num = float(val)
                        else:
                            raw_str = str(val).replace('€', '').replace(' ', '').replace('.', '').replace(',', '.').strip()
                            num = float(raw_str)
                            
                        if num == 0:
                            return '0,00 €'
                        if num >= 1000000:
                            num = num / 10000.0
                            
                        formatted = f"{num:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
                        return f"{formatted} €"
                    except Exception:
                        return str(val).strip()

                def get_exact_col_val(row, col_map, target_name):
                    target = target_name.lower().strip()
                    if target in col_map:
                        return row[col_map[target]]
                    for cname, idx in col_map.items():
                        if target in cname:
                            return row[idx]
                    return None

                p_stimato = format_access_price(get_exact_col_val(row, col_map, "prezzo stimato"))
                p_aut = format_access_price(get_exact_col_val(row, col_map, "prezzo autoscout"))
                p_vendita = format_access_price(get_exact_col_val(row, col_map, "prezzo di vendita") or get_exact_col_val(row, col_map, "prezzo di v"))
                
                raw_pronta = get_val(row, col_map, ["pronta"])
                pronta = bool(raw_pronta) if raw_pronta is not None else False

                data.append({
                    "indice": indice,
                    "targa": targa,
                    "marca": marca,
                    "versione": versione,
                    "data_immatricolazione": dt_val.isoformat() if dt_val else None,
                    "km": km_val,
                    "colore": colore,
                    "carburante": carburante,
                    "cambio": cambio,
                    "prezzo_stimato": p_stimato,
                    "prezzo_aut": p_aut,
                    "prezzo_vendita": p_vendita,
                    "pronta": pronta
                })
            except Exception as row_e:
                print(f"[StockUsato Row Error] {row_e}", flush=True)
                continue

        print(f"[StockUsato Debug] Successfully parsed {len(data)} vehicle items!", flush=True)
        return data
    except Exception as e:
        print(f"[StockUsato] Fetch error: {e}", flush=True)
        return []
    finally:
        if cursor:
            try: cursor.close()
            except Exception: pass
        if conn:
            try: conn.close()
            except Exception: pass

def push_stock_usato_to_render(items):
    """Pushes stock_usato items directly to live Render cloud server and local Node backend."""
    if not items:
        return
    req_data = json.dumps({"items": items}).encode("utf-8")
    
    # 1. Push to local Node server
    try:
        local_url = "http://localhost:5000/api/sync/push-stock-usato"
        req_local = urllib.request.Request(
            local_url,
            data=req_data,
            headers={"Content-Type": "application/json", "User-Agent": "RossomandiSyncService/1.0"}
        )
        with urllib.request.urlopen(req_local, timeout=10) as resp:
            print(f"[StockUsato Local Node Sync] Successfully pushed {len(items)} vehicles to Local Server! (HTTP {resp.status})", flush=True)
    except Exception as err:
        pass

    # 2. Push to Render Cloud server
    try:
        render_url = "https://rossomandi-backend.onrender.com/api/sync/push-stock-usato"
        req_render = urllib.request.Request(
            render_url,
            data=req_data,
            headers={"Content-Type": "application/json", "User-Agent": "RossomandiSyncService/1.0"}
        )
        with urllib.request.urlopen(req_render, timeout=30) as resp:
            print(f"[StockUsato Live Sync] Successfully pushed {len(items)} vehicles to Render Cloud DB! (HTTP {resp.status})", flush=True)
    except Exception as err:
        print(f"[StockUsato Live Sync Notice] {err}", flush=True)

def upsert_stock_usato_to_local_postgresql(items):
    """Inserts or updates stock_usato items in local PostgreSQL."""
    if not items:
        return
    pg_conn = None
    try:
        pg_conn = psycopg2.connect(
            host=PG_HOST,
            port=PG_PORT,
            dbname=PG_DATABASE,
            user=PG_USER,
            password=PG_PASSWORD
        )
        cursor = pg_conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS public.stock_usato (
                indice INT PRIMARY KEY,
                targa VARCHAR(50),
                marca VARCHAR(100),
                versione VARCHAR(255),
                data_immatricolazione TIMESTAMP WITH TIME ZONE,
                km INT,
                colore VARCHAR(100),
                carburante VARCHAR(100),
                cambio VARCHAR(100),
                prezzo_stimato TEXT,
                prezzo_aut TEXT,
                prezzo_vendita TEXT,
                pronta BOOLEAN DEFAULT FALSE,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE public.stock_usato ALTER COLUMN prezzo_stimato TYPE TEXT USING prezzo_stimato::TEXT;
            ALTER TABLE public.stock_usato ALTER COLUMN prezzo_aut TYPE TEXT USING prezzo_aut::TEXT;
            ALTER TABLE public.stock_usato ALTER COLUMN prezzo_vendita TYPE TEXT USING prezzo_vendita::TEXT;
        """)

        for item in items:
            cursor.execute("""
                INSERT INTO public.stock_usato (indice, targa, marca, versione, data_immatricolazione, km, colore, carburante, cambio, prezzo_stimato, prezzo_aut, prezzo_vendita, pronta, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (indice)
                DO UPDATE SET
                    targa = EXCLUDED.targa,
                    marca = EXCLUDED.marca,
                    versione = EXCLUDED.versione,
                    data_immatricolazione = EXCLUDED.data_immatricolazione,
                    km = EXCLUDED.km,
                    colore = EXCLUDED.colore,
                    carburante = EXCLUDED.carburante,
                    cambio = EXCLUDED.cambio,
                    prezzo_stimato = EXCLUDED.prezzo_stimato,
                    prezzo_aut = EXCLUDED.prezzo_aut,
                    prezzo_vendita = EXCLUDED.prezzo_vendita,
                    pronta = EXCLUDED.pronta,
                    updated_at = CURRENT_TIMESTAMP
            """, (
                item["indice"], item["targa"], item["marca"], item["versione"],
                item["data_immatricolazione"], item["km"], item["colore"],
                item["carburante"], item["cambio"], item["prezzo_stimato"],
                item["prezzo_aut"], item["prezzo_vendita"], item["pronta"]
            ))

        pg_conn.commit()
        print(f"[StockUsato Local Sync] Successfully synced {len(items)} vehicles to local PostgreSQL!", flush=True)
    except Exception as e:
        print(f"[StockUsato Local Sync Error] {e}", flush=True)
        if pg_conn:
            pg_conn.rollback()
    finally:
        if pg_conn:
            pg_conn.close()

def main():
    print("MS Access Backend Sync Service started.", flush=True)
    user_home = os.path.expanduser("~")
    candidate_paths = [
        r"C:\Users\Public\Documents\Agenda Vendita\Gestione VN2_be.accdb",
        r"\\192.168.12.250\Agenda_Vendita\Gestione VN2_be.accdb",
        r"\\192.168.12.250\Agenda Vendita\Gestione VN2_be.accdb",
        r"Z:\Gestione VN2_be.accdb",
        r"Z:\Agenda Vendita\Gestione VN2_be.accdb",
        r"C:\Users\Public\Public Documents\Agenda Vendita\Gestione VN2_be.accdb",
        os.path.join(user_home, "Documents", "Agenda Vendita", "Gestione VN2_be.accdb"),
        os.path.join(user_home, "Desktop", "Gestione VN2_be.accdb"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_sync.accdb"),
    ]

    while True:
        try:
            data = None
            stock_data = None
            for path in candidate_paths:
                if os.path.exists(path):
                    is_server = "192.168.12.250" in path or path.startswith("Z:")
                    tag = "LIVE SERVER" if is_server else "LOCAL FALLBACK"
                    print(f"[{tag}] Connected to Access DB at: {path}", flush=True)
                    data = fetch_access_data(path)
                    stock_data = fetch_stock_usato_data(path)
                    if data or stock_data:
                        break
                                
            if data:
                print(f"[Sync] Read {len(data)} records from Access DB. Syncing to PostgreSQL...", flush=True)
                upsert_to_postgresql(data)
            
            if stock_data:
                print(f"[StockUsato] Read {len(stock_data)} vehicles from Access DB. Syncing...", flush=True)
                upsert_stock_usato_to_local_postgresql(stock_data)
                push_stock_usato_to_render(stock_data)

        except Exception as e:
            print(f"Sync loop error: {e}", flush=True)
            
        time.sleep(5)

if __name__ == "__main__":
    main()
