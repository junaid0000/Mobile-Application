import sys
import os
import json
import pyodbc
from datetime import datetime, date

def default_serializer(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    return str(obj)

def get_database1_cars():
    try:
        db_paths = [
            r"C:\Users\Public\Documents\Agenda Vendita\Gestione VN2_be.accdb",
            r"Z:\Gestione VN2_be.accdb",
            r"\\192.168.12.250\Agenda_Vendita\Gestione VN2_be.accdb",
            r"C:\Users\Public\Public Documents\Agenda Vendita\Gestione VN2_be.accdb",
        ]

        target_path = None
        for p in db_paths:
            if os.path.exists(p):
                target_path = p
                break

        if not target_path:
            print(json.dumps({"success": False, "error": "MS Access database file Gestione VN2_be.accdb not found"}))
            return

        conn_str = f"DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={target_path};ReadOnly=1;"
        conn = pyodbc.connect(conn_str, autocommit=True)
        cursor = conn.cursor()

        # Query ONLY car 23556 from MS Access Database1
        cursor.execute("SELECT * FROM [Database1] WHERE [Interno] = '23556' OR [Indice] = 23556;")
        cols = [r[0] for r in cursor.description]
        rows = cursor.fetchall()

        # Fallback if 23556 not found directly by integer match
        if not rows:
            cursor.execute("SELECT TOP 1 * FROM [Database1] ORDER BY [Interno] DESC;")
            rows = cursor.fetchall()

        cars = []
        for r in rows:
            row_dict = {}
            for i, col_name in enumerate(cols):
                val = r[i]
                if val is not None:
                    if isinstance(val, (datetime, date)):
                        row_dict[col_name] = val.isoformat()
                    else:
                        row_dict[col_name] = val
                else:
                    row_dict[col_name] = ""
            cars.append(row_dict)

        cursor.close()
        conn.close()

        print(json.dumps({"success": True, "count": len(cars), "cars": cars}, default=default_serializer))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == '__main__':
    get_database1_cars()
