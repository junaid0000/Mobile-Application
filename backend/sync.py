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

def exists_with_timeout(path, timeout=1.5):
    """Checks if a path exists using a background thread to prevent infinite OS blocking on UNC network paths."""
    res = [False]
    def worker():
        try:
            res[0] = os.path.exists(path)
        except Exception:
            pass
    t = threading.Thread(target=worker)
    t.daemon = True
    t.start()
    t.join(timeout)
    return res[0]

def resolve_source_db():
    """Resolves whether to read from the live server backend or the local backup file."""
    # 1. Quick connection check to server host on port 445
    if check_network_host("192.168.12.250", port=445, timeout=1.0):
        # 2. Check if the backend UNC share is available
        if exists_with_timeout(BACKEND_NETWORK_PATH, timeout=1.5):
            return BACKEND_NETWORK_PATH
            
    return BACKEND_LOCAL_PATH

def fetch_access_data(db_path):
    """Reads data from the specified MS Access database file by copying it locally first."""
    temp_path = os.path.abspath("temp_sync.accdb")
    
    try:
        # Copy file locally to prevent locks and network latency issues
        shutil.copy2(db_path, temp_path)
    except Exception as copy_err:
        print(f"Error copying Access DB to temp file: {copy_err}")
        return []
        
    conn = None
    cursor = None
    try:
        conn_str = f"DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={temp_path};ReadOnly=1;"
        conn = pyodbc.connect(conn_str, autocommit=True)
        cursor = conn.cursor()
        
        # Check if table 'Appuntamenti' exists in Access
        tables = [t.table_name.lower() for t in cursor.tables(tableType='TABLE')]
        use_appuntamenti = 'appuntamenti' in tables
        
        data = []
        if use_appuntamenti:
            print("[Sync] Found new Appuntamenti table. Querying it directly...")
            # Check if Sede exists in Appuntamenti columns
            columns = [col[3].lower() for col in cursor.columns(table='Appuntamenti')]
            has_sede = 'sede' in columns
            
            if has_sede:
                query = "SELECT Indice, Cliente, Venditore, AppuntVendita, FasciaOrariaVendita, Sede FROM [Appuntamenti] WHERE Indice IS NOT NULL;"
            else:
                query = "SELECT Indice, Cliente, Venditore, AppuntVendita, FasciaOrariaVendita FROM [Appuntamenti] WHERE Indice IS NOT NULL;"
                
            cursor.execute(query)
            rows = cursor.fetchall()
            
            for row in rows:
                interno = str(row[0]).strip() if row[0] is not None else None
                cliente = row[1].strip() if row[1] else None
                venditore = row[2].strip() if row[2] else None
                date_val = row[3]
                time_str = str(row[4]).strip() if row[4] is not None else ""
                sede = row[5].strip() if has_sede and row[5] else ""
                
                luogo = sede if sede else None
                
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
                            
                data.append((interno, cliente, venditore, data_ora, luogo))
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
                
                data.append((interno, cliente, venditore, data_ora, luogo))
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
        # Clean up the temporary file
        if os.path.exists(temp_path):
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
            INSERT INTO public.appointments (intorno, cliente, venditore, data_ora, luogo)
            VALUES %s
            ON CONFLICT (intorno) 
            DO UPDATE SET 
                cliente = EXCLUDED.cliente,
                venditore = EXCLUDED.venditore,
                data_ora = EXCLUDED.data_ora,
                luogo = EXCLUDED.luogo,
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
    last_mtime = None
    
    while True:
        try:
            db_path = resolve_source_db()
            if os.path.exists(db_path):
                # Check file modification time to see if it changed
                mtime = os.path.getmtime(db_path)
                if mtime != last_mtime:
                    print(f"Syncing backend database file: {db_path}")
                    last_mtime = mtime
                    
                    data = fetch_access_data(db_path)
                    if data:
                        upsert_to_postgresql(data)
            else:
                print(f"Warning: Access file not found at {db_path}.")
        except Exception as e:
            print(f"Sync loop error: {e}")
            
        # Check for updates every 7 seconds
        time.sleep(7)

if __name__ == "__main__":
    main()
