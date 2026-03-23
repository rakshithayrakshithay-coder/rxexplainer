import pandas as pd
import mysql.connector

df = pd.read_csv("medicine_dataset.csv")
print("Columns found:", df.columns.tolist())
print(f"Total rows: {len(df)}")

conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="Nous@12345",
    database="prescription_db"
)
cursor = conn.cursor()

success = 0
for _, row in df.iterrows():
    try:
        cursor.execute("""
            INSERT INTO medicines (name, category, dosage_form, strength, manufacturer, indication, classification)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            str(row.get('Name', '')),
            str(row.get('Category', '')),
            str(row.get('Dosage Form', '')),
            str(row.get('Strength', '')),
            str(row.get('Manufacturer', '')),
            str(row.get('Indication', '')),
            str(row.get('Classification', ''))
        ))
        success += 1
    except Exception as e:
        print(f"Skipped row: {e}")

conn.commit()
cursor.close()
conn.close()
print(f"✅ Done! {success} medicines imported.")