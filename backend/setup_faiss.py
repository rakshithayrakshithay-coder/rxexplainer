"""
Run this script ONCE to load your medicine dataset into FAISS.
Usage: python setup_faiss.py
"""

import faiss
import numpy as np
import pandas as pd
import json
import os
from sklearn.feature_extraction.text import TfidfVectorizer
import pickle

print("Loading medicine dataset...")
df = pd.read_csv("medicine_dataset.csv")
df.columns = df.columns.str.strip()
df = df.fillna("")

# Limit to first 5000 for speed
df = df.head(5000)
print(f"Loaded {len(df)} medicines.")

# Build documents — combine fields for better semantic search
documents = []
metadata = []

for i, row in df.iterrows():
    doc = (
        f"{row.get('Name', '')} {row.get('Category', '')} "
        f"{row.get('Indication', '')} {row.get('Dosage Form', '')} "
        f"{row.get('Classification', '')}"
    )
    documents.append(doc)
    metadata.append({
        "name": str(row.get("Name", "")),
        "category": str(row.get("Category", "")),
        "indication": str(row.get("Indication", "")),
        "dosage_form": str(row.get("Dosage Form", "")),
        "strength": str(row.get("Strength", "")),
        "classification": str(row.get("Classification", "")),
        "manufacturer": str(row.get("Manufacturer", ""))
    })

print("Building TF-IDF vectors...")
vectorizer = TfidfVectorizer(max_features=512)
vectors = vectorizer.fit_transform(documents).toarray().astype(np.float32)

# Normalize vectors for cosine similarity
faiss.normalize_L2(vectors)

# Build FAISS index
dimension = vectors.shape[1]
index = faiss.IndexFlatIP(dimension)
index.add(vectors)

print(f"FAISS index built with {index.ntotal} medicines.")

# Save everything
os.makedirs("faiss_db", exist_ok=True)
faiss.write_index(index, "faiss_db/medicines.index")

with open("faiss_db/metadata.json", "w") as f:
    json.dump(metadata, f)

with open("faiss_db/vectorizer.pkl", "wb") as f:
    pickle.dump(vectorizer, f)

print("\n✅ FAISS setup complete! Files saved in ./faiss_db/")
print(f"Total medicines indexed: {index.ntotal}")