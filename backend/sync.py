import pyodbc
pyodbc.pooling = False
import psycopg2
from psycopg2.extras import execute_values
import time
import os
import shutil
import socket
import threading

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
    if Platform.OS if 'Platform' in globals() else False:
        pass
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
                    elif isinstance(val, int):
                        cancellato = (val != 0)
                    elif val is not None:
                        cancellato = str(val).strip().lower() in ('true', 'yes', 'si', '-1', '1')
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
        pg_conn = psycopg2.connect(PG_CONN_STR)
        cursor = pg_conn.cursor()
        
        # Purge legacy format rows without underscore on every sync loop pass
        cursor.execute("DELETE FROM appointments WHERE POSITION('_' IN intorno) = 0;")
        
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
        
        execute_values(cursor, upsert_query, deduplicated_data)
        pg_conn.commit()
        print(f"Successfully synced {len(deduplicated_data)} unique records to PostgreSQL.")
    except Exception as e:
        print(f"Error writing to PostgreSQL: {e}")
        if pg_conn:
            pg_conn.rollback()
    finally:
        if pg_conn:
            pg_conn.close()

def main():
    print("MS Access Backend Sync Service started.", flush=True)
    user_home = os.path.expanduser("~")
    candidate_paths = [
        r"Z:\Gestione VN2_be.accdb",
        r"Z:\Agenda Vendita\Gestione VN2_be.accdb",
        r"C:\Users\Public\Documents\Agenda Vendita\Gestione VN2_be.accdb",
        r"C:\Users\Public\Public Documents\Agenda Vendita\Gestione VN2_be.accdb",
        os.path.join(user_home, "Documents", "Agenda Vendita", "Gestione VN2_be.accdb"),
        os.path.join(user_home, "Desktop", "Gestione VN2_be.accdb"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_sync.accdb"),
        r"\\192.168.12.250\Agenda_Vendita\Gestione VN2_be.accdb",
        r"\\192.168.12.250\Agenda Vendita\Gestione VN2_be.accdb",
    ]
    
    # Clean up old legacy rows in PostgreSQL that don't use the concatenated unique key format
    try:
        pg_c = psycopg2.connect(PG_CONN_STR)
        with pg_c.cursor() as cur:
            cur.execute("DELETE FROM appointments WHERE POSITION('_' IN intorno) = 0;")
            pg_c.commit()
        pg_c.close()
    except Exception:
        pass

    while True:
        try:
            data = None
            for path in candidate_paths:
                if os.path.exists(path):
                    print(f"[Sync] Found Access DB at: {path}", flush=True)
                    data = fetch_access_data(path)
                    if data:
                        break
                                
            if data:
                print(f"[Sync] Read {len(data)} records from Access DB. Syncing to PostgreSQL...", flush=True)
                upsert_to_postgresql(data)
            else:
                print("[Sync] Access DB not found. Checked paths:", flush=True)
                for p in candidate_paths:
                    print(f"  - {p}", flush=True)
                print("[Sync] Waiting 7 seconds...", flush=True)
                
        except Exception as e:
            print(f"Sync loop error: {e}", flush=True)
            
        time.sleep(7)

if __name__ == "__main__":
    main()
