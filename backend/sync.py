import pyodbc
import psycopg2
from psycopg2.extras import execute_values
import time
import os
import shutil
import socket
import threading

# --- CONFIGURATION ---
# Network UNC path to the live backend database on the server
BACKEND_NETWORK_PATH = r"\\192.168.12.250\Agenda_Vendita\Gestione VN2_be.accdb"

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



def fetch_access_data(db_path):
    """Reads data from the specified MS Access database file, copying locally if local, or connecting directly if UNC network path."""
    temp_path = os.path.abspath("temp_sync.accdb")
    is_temp = False
    conn_path = db_path
    
    is_unc = db_path.startswith(r"\\")
    
    if not is_unc:
        try:
            # Copy local file to prevent locks and network latency issues on local disk
            shutil.copy2(db_path, temp_path)
            conn_path = temp_path
            is_temp = True
        except Exception as copy_err:
            print(f"Warning: Could not copy Access DB to temp file (locked). Connecting directly: {copy_err}")
    else:
        print(f"[Sync] Network UNC path detected. Connecting directly to: {db_path}")
        
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
            
            select_cols = ["Indice", "Cliente", "Venditore", "AppuntVendita", "FasciaOrariaVendita"]
            if note_col:
                select_cols.append(f"[{note_col}]")
            if cancel_col:
                select_cols.append(f"[{cancel_col}]")
                
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
                
                # Combine Date and Time
                data_ora = None
                if date_val:
                    from datetime import datetime
                    if isinstance(date_val, datetime):
                        dt = date_val
                    else:
                        # Try parsing dd/mm/yyyy format first
                        try:
                            dt = datetime.strptime(str(date_val).strip(), '%d/%m/%Y')
                        except Exception:
                            try:
                                dt = datetime.strptime(str(date_val).strip(), '%Y-%m-%d %H:%M:%S')
                            except Exception:
                                dt = None
                                
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
                            
                data.append((interno, cliente, venditore, data_ora, luogo, note, cancellato))
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
                if date_val:
                    from datetime import datetime
                    if isinstance(date_val, datetime):
                        dt = date_val
                    else:
                        try:
                            dt = datetime.strptime(str(date_val), '%Y-%m-%d %H:%M:%S')
                        except Exception:
                            dt = None
                            
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
                
                data.append((interno, cliente, venditore, data_ora, luogo, None, False))
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
        
        upsert_query = """
            INSERT INTO public.appointments (intorno, cliente, venditore, data_ora, luogo, note, cancellato)
            VALUES %s
            ON CONFLICT (intorno) 
            DO UPDATE SET 
                cliente = EXCLUDED.cliente,
                venditore = EXCLUDED.venditore,
                data_ora = EXCLUDED.data_ora,
                luogo = EXCLUDED.luogo,
                note = EXCLUDED.note,
                cancellato = EXCLUDED.cancellato,
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
    print("MS Access Backend Sync Service started.")
    
    while True:
        try:
            data = None
            db_path = None
            
            # 1. Try syncing from the network server database first if SMB is active
            if check_network_host("192.168.12.250", port=445, timeout=1.0):
                print(f"[Sync] Server online. Trying network path: {BACKEND_NETWORK_PATH}")
                db_path = BACKEND_NETWORK_PATH
                data = fetch_access_data(db_path)
                
            # 2. Fall back to the local database file if network is unreachable or fetched no data
            if not data:
                print(f"[Sync] Using local fallback path: {BACKEND_LOCAL_PATH}")
                db_path = BACKEND_LOCAL_PATH
                data = fetch_access_data(db_path)
                
            if data:
                upsert_to_postgresql(data)
                
        except Exception as e:
            print(f"Sync loop error: {e}")
            
        # Check for updates every 7 seconds
        time.sleep(7)

if __name__ == "__main__":
    main()
