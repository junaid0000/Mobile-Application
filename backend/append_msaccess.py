import sys
import os
import json
import pyodbc

def append_to_databaseclienti():
    try:
        # Read JSON payload from stdin to avoid Windows CLI quote escaping issues
        input_data = sys.stdin.read().strip()
        if not input_data:
            print(json.dumps({"success": False, "error": "No JSON payload provided in stdin"}))
            return

        payload = json.loads(input_data)
        interno = str(payload.get('interno', '')).strip()
        nome = payload.get('acquirente_nome', '').strip()
        cognome = payload.get('acquirente_cognome', '').strip()
        telefono = payload.get('acquirente_telefono', '').strip()
        full_name = f"{cognome} {nome}".strip().upper()

        # Database file paths to search
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

        # Connect to MS Access DB
        conn_str = f"DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={target_path};ReadOnly=0;"
        conn = pyodbc.connect(conn_str, autocommit=True)
        cursor = conn.cursor()

        # 1. Compute next Indice (max Indice + 1, starting at 37982)
        cursor.execute("SELECT MAX(Indice) FROM [DatabaseClienti];")
        row_idx = cursor.fetchone()
        max_idx = row_idx[0] if (row_idx and row_idx[0]) else 37981
        next_indice = int(max_idx) + 1 if int(max_idx) >= 37981 else 37982

        # 2. Fetch full vehicle row from Database1 for car interno
        db1_dict = {}
        try:
            cursor.execute("SELECT * FROM [Database1] WHERE [Interno] = ? OR [Indice] = ?;", (interno, int(interno) if interno.isdigit() else 0))
            db1_row = cursor.fetchone()
            if db1_row:
                db1_cols = [r.column_name for r in cursor.columns(table='Database1')]
                db1_dict = dict(zip(db1_cols, db1_row))
        except Exception as fetch_err:
            pass

        # 3. Format buyer info for end-of-row Testo6 column
        buyer_end_text = f"{full_name} (Tel: {telefono})".strip() if telefono else full_name

        # 4. Insert full row into DatabaseClienti (preserving Database1 columns 100% unchanged, placing seller buyer input at the end in Testo6)
        insert_sql = """
            INSERT INTO [DatabaseClienti] 
            (Indice, Interno, Cliente, Telefono, [E-mail], [Nato a], [Nato a Prov], [Nato il], [Residente a], [indirizzo], Provincia, cap, [Cod fisc], [Solo Partita iva], Telefono2, [Num Civ], Testo5, Testo6, Testo13)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """

        cursor.execute(insert_sql, (
            next_indice,
            interno,
            db1_dict.get('Cliente'),
            db1_dict.get('Telefono'),
            db1_dict.get('E-mail'),
            db1_dict.get('Nato a'),
            db1_dict.get('Nato a Prov'),
            db1_dict.get('Nato il'),
            db1_dict.get('Residente a'),
            db1_dict.get('indirizzo'),
            db1_dict.get('Provincia'),
            db1_dict.get('cap'),
            db1_dict.get('Cod fisc'),
            db1_dict.get('Solo Partita iva'),
            db1_dict.get('Telefono2'),
            db1_dict.get('Num Civ'),
            db1_dict.get('Testo5'),
            buyer_end_text,
            db1_dict.get('Testo13')
        ))

        cursor.close()
        conn.close()

        print(json.dumps({"success": True, "indice": next_indice, "cliente": full_name}))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == '__main__':
    append_to_databaseclienti()
