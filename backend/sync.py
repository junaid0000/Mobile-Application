import pyodbc
import psycopg2
from psycopg2.extras import execute_values
import time
import os
import glob

# --- CONFIGURATION ---
# Folder where MS Access files are stored
ACCESS_DIR = r"C:\Users\Public\Desktop\Strumenti"

# PostgreSQL credentials (pre-configured from your local .env file)
PG_HOST = "localhost" 
PG_PORT = "5432"
PG_DATABASE = "postgres"
PG_USER = "postgres"
PG_PASSWORD = "postgres"

PG_CONN_STR = f"host={PG_HOST} port={PG_PORT} dbname={PG_DATABASE} user={PG_USER} password={PG_PASSWORD}"

import re

def get_version(filename):
    """Extracts the version number (e.g. 12.44) from the filename to sort correctly."""
    match = re.search(r'(\d+\.\d+)', filename)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            pass
    return 0.0

def get_latest_access_db(directory):
    """Finds the file with the highest version number matching 'HubOrganizer *.accdb' in the directory."""
    if not os.path.exists(directory):
        print(f"Warning: Directory {directory} does not exist yet. Please make sure the path is correct.")
        return None
        
    pattern = os.path.join(directory, "HubOrganizer *.accdb")
    files = glob.glob(pattern)
    if not files:
        # Fallback to any .accdb in the directory if the name changes completely
        files = glob.glob(os.path.join(directory, "*.accdb"))
        
    if not files:
        return None
        
    # Exclude files containing 'bkp', 'backup', 'copy', or 'copia' (case-insensitive)
    files = [f for f in files if not any(x in os.path.basename(f).lower() for x in ['bkp', 'backup', 'copy', 'copia'])]
    
    if not files:
        return None
        
    # Sort files by version number (highest version first)
    files.sort(key=lambda f: get_version(os.path.basename(f)), reverse=True)
    return files[0]

def fetch_access_data(db_path):
    """Reads data from the specified MS Access database file."""
    # Connect in read-only mode to prevent database locks or accidental updates
    conn_str = f"DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={db_path};ReadOnly=1;"
    conn = None
    try:
        conn = pyodbc.connect(conn_str, autocommit=True)
        cursor = conn.cursor()
        
        # Query columns from the Database1 table in MS Access
        # Replace 'Inizio' or other fields if you decide to change column mapping
        # Here we attempt to fetch data. In MS Access, dates are usually dates, we read them directly.
        query = """
            SELECT Intorno, Cliente, Venditore, [inizio .g]
            FROM [Database1]
            WHERE Intorno IS NOT NULL;
        """
        try:
            cursor.execute(query)
            rows = cursor.fetchall()
            
            data = []
            for row in rows:
                intorno = row.Intorno
                cliente = row.Cliente.strip() if row.Cliente else None
                venditore = row.Venditore.strip() if row.Venditore else None
                data_ora = row[3]  # This is the date column (e.g. inizio .g)
                
                data.append((intorno, cliente, venditore, data_ora))
            return data
        except Exception as query_err:
            print(f"Error querying table with [inizio .g]: {query_err}")
            print("Attempting fallback query without [inizio .g] column...")
            fallback_query = """
                SELECT Intorno, Cliente, Venditore
                FROM [Database1]
                WHERE Intorno IS NOT NULL;
            """
            cursor.execute(fallback_query)
            rows = cursor.fetchall()
            data = []
            for row in rows:
                intorno = row.Intorno
                cliente = row.Cliente.strip() if row.Cliente else None
                venditore = row.Venditore.strip() if row.Venditore else None
                data.append((intorno, cliente, venditore, None))
            return data
    except Exception as e:
        print(f"Error connecting or reading Access DB ({os.path.basename(db_path)}): {e}")
        return []
    finally:
        if conn:
            conn.close()

def upsert_to_postgresql(data):
    """Inserts new or updates existing records in PostgreSQL."""
    if not data:
        return
        
    pg_conn = None
    try:
        pg_conn = psycopg2.connect(PG_CONN_STR)
        cursor = pg_conn.cursor()
        
        upsert_query = """
            INSERT INTO public.appointments (intorno, cliente, venditore, data_ora)
            VALUES %s
            ON CONFLICT (intorno) 
            DO UPDATE SET 
                cliente = EXCLUDED.cliente,
                venditore = EXCLUDED.venditore,
                data_ora = EXCLUDED.data_ora,
                last_sync = CURRENT_TIMESTAMP;
        """
        
        execute_values(cursor, upsert_query, data)
        pg_conn.commit()
        print(f"Successfully synced {len(data)} records to PostgreSQL.")
    except Exception as e:
        print(f"Error writing to PostgreSQL: {e}")
        if pg_conn:
            pg_conn.rollback()
    finally:
        if pg_conn:
            pg_conn.close()

def main():
    print("MS Access Sync Service started.")
    last_processed_file = None
    
    while True:
        try:
            latest_db = get_latest_access_db(ACCESS_DIR)
            if not latest_db:
                print(f"Warning: No MS Access file found in {ACCESS_DIR}. Check directory path.")
            else:
                if latest_db != last_processed_file:
                    print(f"Newer or updated database file detected: {os.path.basename(latest_db)}")
                    last_processed_file = latest_db
                
                data = fetch_access_data(latest_db)
                if data:
                    upsert_to_postgresql(data)
                
        except Exception as e:
            print(f"Sync loop error: {e}")
        
        # Check for updates every 30 seconds
        time.sleep(30)

if __name__ == "__main__":
    main()
