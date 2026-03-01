import sqlite3
import uuid
from datetime import datetime

import os

# Path to the Tauri app's local database
DB_PATH = os.path.join(os.environ["APPDATA"], "com.mrm.sortingcalculator", "sorting.db")

# Data from the user's image
offers_data = [
    # Num projet, Référence, Désignation, Cadence, Quantité à trier, Seuil d'alerte
    ("30395057", "Z13005309", "Conduit bi turbo XFA56", 36, 1000, 108),
    ("30395057", "Z13005308", "Conduit bi turbo XFA56", 36, 1000, 300),
    ("30395053", "Z13005310", "Conduit Bend XFA568", 41, 1000, 300),
    ("30395053", "Z13005311", "Conduit Bend XFA568", 41, 1000, 300),
    ("30395341", "Z13004721", "XFA 469 Raccor", 128, 1000, 300),
    ("30397520", "Z12017091", "Capsule moteur XEM", 180, 1000, 300),
    ("30396497", "Z16006865", "Tube EGR 4572pcs", 80, 1000, 0),
    ("30395337", "Z13005246", "CP3", 32, 1000, 0),
    ("30395336", "Z13004280", "Répartiteur B38T42", 30, 1000, 0),
    ("30395052", "Z13004758", "Conduit Entrée Turbo", 24, 1000, 0),
    ("30395052", "Z13004842", "Conduit Entrée Turbo", 24, 1000, 0),
    ("30395045", "Z13004759", "Conduit Bend XFA521", 24, 1000, 0),
    ("30394896", "Z130005135", "Blowby Cover XC13", 235, 1000, 0),
    ("30394890", "Z13004322", "XEM 135", 24, 1000, 0),
    ("30394732", "Z13004602", "XEM 126 Retouche", 18, 1000, 360),
    ("30397521", "FZ13004323", "XEM 127 Firewall", 100, 1000, 0),
    ("30394706", "RZ13004323", "XEM 127 Retouche", 24, 1000, 0),
    ("30394892", "", "XEM 129 Retouche", 24, 1000, 0),
    ("", "Z13005515", "SPIDER HAHN", 224, 1000, 0),
    ("", "Y2640", "COND. K", 50, 1000, 0),
    ("", "z13003538", "REPARTI", 0, 1000, 0), # No cadence given
    ("30396222", "Z16007325", "XEM 126 CORP ALU", 50, 1000, 0)
]

def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get a customer ID to assign these offers to. We'll pick the first one, or insert a default one.
    cursor.execute("SELECT id FROM customers LIMIT 1")
    result = cursor.fetchone()
    
    if result:
        customer_id = result[0]
    else:
        customer_id = str(uuid.uuid4())
        cursor.execute("INSERT INTO customers (id, name, email) VALUES (?, ?, ?)", 
                       (customer_id, "Imported Client", "import@example.com"))
        print(f"Created default customer with ID {customer_id}")

    count = 0
    for row in offers_data:
        num_projet, ref, desig, cadence, qty, alert = row
        
        # Ensure values aren't empty
        if not ref.strip():
            ref = "SANS-REF"
        if not num_projet.strip():
            num_projet = "SANS-PROJET"
            
        offer_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        try:
            cursor.execute('''
                INSERT INTO offers (
                    id, customer_id, project_number, designation, reference, 
                    cadence_per_hour, price_per_piece, quantity_offer, alert_threshold, 
                    quantity_in_stock, is_archived, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
            ''', (
                offer_id, customer_id, num_projet, desig, ref, 
                float(cadence) if cadence else 1.0, 
                0.0, # default price 
                int(qty), int(alert), int(qty),
                now, now
            ))
            count += 1
        except Exception as e:
            print(f"Error inserting row {row}: {e}")

    conn.commit()
    conn.close()
    print(f"Successfully inserted {count} offers into {DB_PATH}.")

if __name__ == "__main__":
    main()
