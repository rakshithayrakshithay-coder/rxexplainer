from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import requests
import os
import hashlib
import faiss
import numpy as np
import json
import pickle
import re
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ── FAISS Setup ──────────────────────────────────────────────
try:
    faiss_index = faiss.read_index("faiss_db/medicines.index")
    with open("faiss_db/metadata.json", "r") as f:
        faiss_metadata = json.load(f)
    with open("faiss_db/vectorizer.pkl", "rb") as f:
        faiss_vectorizer = pickle.load(f)
    print(f"✅ FAISS loaded — {faiss_index.ntotal} medicines indexed")
except Exception as e:
    faiss_index = None
    faiss_metadata = []
    faiss_vectorizer = None
    print(f"⚠️ FAISS not ready: {e} — Run setup_faiss.py first")


def search_faiss(query, n=5):
    if not faiss_index or not faiss_vectorizer:
        return []
    vec = faiss_vectorizer.transform([query]).toarray().astype(np.float32)
    faiss.normalize_L2(vec)
    distances, indices = faiss_index.search(vec, n)
    results = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx == -1:
            continue
        results.append({"metadata": faiss_metadata[idx], "score": float(dist)})
    return results


def get_db():
    return mysql.connector.connect(
        host="localhost", user="root",
        password=os.getenv("DB_PASSWORD"),
        database="prescription_db"
    )

def hash_password(p):
    return hashlib.sha256(p.encode()).hexdigest()

def query_grok(prompt, history=None):
    api_key = os.getenv("GROK_API_KEY")
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    if history:
        messages = history
    else:
        messages = [
            {"role": "system", "content": "You are a helpful medical assistant. Explain medicines clearly and simply for patients."},
            {"role": "user", "content": prompt}
        ]
    body = {
        "model": "llama-3.3-70b-versatile",
        "messages": messages,
        "max_tokens": 500
    }
    res = requests.post("https://api.groq.com/openai/v1/chat/completions", json=body, headers=headers)
    result = res.json()
    if "choices" not in result:
        raise Exception(f"Groq API error: {result}")
    return result["choices"][0]["message"]["content"]


# ── Auth ─────────────────────────────────────────────────────
@app.route("/api/register", methods=["POST"])
def register():
    try:
        data = request.json
        name = data.get("name","").strip()
        email = data.get("email","").strip()
        password = data.get("password","").strip()
        if not name or not email or not password:
            return jsonify({"error": "All fields are required."}), 400
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters."}), 400
        conn = get_db(); cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            cursor.close(); conn.close()
            return jsonify({"error": "An account with this email already exists."}), 409
        cursor.execute("INSERT INTO users (name, email, password) VALUES (%s, %s, %s)", (name, email, hash_password(password)))
        conn.commit(); cursor.close(); conn.close()
        return jsonify({"message": "Account created successfully."}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/login", methods=["POST"])
def login():
    try:
        data = request.json
        email = data.get("email","").strip()
        password = data.get("password","").strip()
        if not email or not password:
            return jsonify({"error": "Email and password are required."}), 400
        conn = get_db(); cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, name, email FROM users WHERE email = %s AND password = %s", (email, hash_password(password)))
        user = cursor.fetchone(); cursor.close(); conn.close()
        if not user:
            return jsonify({"error": "Invalid email or password."}), 401
        return jsonify({"name": user["name"], "email": user["email"]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Explain ──────────────────────────────────────────────────
@app.route("/api/explain", methods=["POST"])
def explain_medicine():
    try:
        data = request.json
        medicine_name = data.get("medicine")
        dosage = data.get("dosage", "")
        language = data.get("language", "English")
        age_group = data.get("age_group", "Adult")
        age = data.get("age", "")

        context = None
        source = "ai"

        if faiss_index:
            try:
                results = search_faiss(medicine_name, n=1)
                if results and results[0]["score"] > 0.3:
                    best = results[0]["metadata"]
                    context = (f"Medicine: {best['name']}, Category: {best['category']}, "
                               f"Form: {best['dosage_form']}, Strength: {best['strength']}, "
                               f"Manufacturer: {best['manufacturer']}, Used for: {best['indication']}, "
                               f"Classification: {best['classification']}")
                    source = "vectordb"
            except Exception as fe:
                print(f"FAISS error: {fe}")

        if not context:
            conn = get_db(); cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM medicines WHERE name LIKE %s LIMIT 1", (f"%{medicine_name}%",))
            db_result = cursor.fetchone(); cursor.close(); conn.close()
            if db_result:
                context = (f"Medicine: {db_result['name']}, Category: {db_result['category']}, "
                           f"Form: {db_result['dosage_form']}, Strength: {db_result['strength']}, "
                           f"Manufacturer: {db_result['manufacturer']}, Used for: {db_result['indication']}, "
                           f"Classification: {db_result['classification']}")
                source = "mysql"

        age_info = f"The patient is {age} years old ({age_group})." if age else (f"The patient is a {age_group}." if age_group != "Adult" else "")
        if age_group == "Child":
            age_instruction = f"{age_info} Provide child-appropriate dosage. Mention weight-based dosing if applicable. Warn about medicines not safe for children."
        elif age_group == "Elderly":
            age_instruction = f"{age_info} Provide elderly-specific guidance: reduced dosage, kidney/liver concerns, fall risk."
        else:
            age_instruction = f"{age_info} Provide standard adult dosage guidance."

        lang_instruction = f"Respond in {language} language." if language != "English" else ""

        if context:
            prompt = f"""Based on this medicine data: {context}
Patient dosage: {dosage}
{age_instruction}
Explain clearly: what it treats, how to take it, precautions, side effects, when to see a doctor.
{lang_instruction}"""
        else:
            prompt = f"""Explain '{medicine_name}' with dosage '{dosage}'.
{age_instruction}
Cover: what it treats, how to take it, precautions, side effects, when to see a doctor.
{lang_instruction}"""

        ai_response = query_grok(prompt)
        conn = get_db(); cursor = conn.cursor()
        cursor.execute("INSERT INTO queries (user_input, ai_response) VALUES (%s, %s)", (f"{medicine_name} - {dosage}", ai_response))
        conn.commit(); cursor.close(); conn.close()
        return jsonify({"response": ai_response, "from_db": source in ["mysql","vectordb"], "source": source, "context": context or ""})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Medicine Chatbot ─────────────────────────────────────────
@app.route("/api/chat", methods=["POST"])
def medicine_chat():
    try:
        data = request.json
        medicine = data.get("medicine", "").strip()
        age_group = data.get("age_group", "Adult")
        context = data.get("context", "")
        history = data.get("history", [])
        message = data.get("message", "").strip()

        if not medicine or not message:
            return jsonify({"error": "Medicine and message are required."}), 400

        system_prompt = f"""You are a helpful medical assistant specializing in medicine information.
The patient is asking about the medicine: '{medicine}'.
Patient age group: {age_group}.
{f'Medicine details: {context}' if context else ''}
Answer the patient's questions clearly and simply.
Keep responses concise — 2 to 4 sentences max unless detail is needed.
Always remind the patient to consult their doctor for personalized advice.
Never recommend changing dosage without doctor approval."""

        full_history = [{"role": "system", "content": system_prompt}]
        for msg in history[1:]:
            full_history.append({
                "role": msg["role"],
                "content": msg.get("content") or msg.get("text", "")
            })

        ai_response = query_grok(None, history=full_history)
        return jsonify({"response": ai_response})

    except Exception as e:
        print(f"Chat ERROR: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ── Similar ──────────────────────────────────────────────────
@app.route("/api/similar", methods=["POST"])
def similar_medicines():
    try:
        medicine_name = request.json.get("medicine","")
        if not faiss_index:
            return jsonify({"error": "FAISS not ready."}), 503
        results = search_faiss(medicine_name, n=5)
        similar = []
        for r in results:
            meta = r["metadata"]
            if meta["name"].lower() == medicine_name.lower(): continue
            similar.append({"name": meta["name"], "category": meta["category"],
                            "indication": meta["indication"], "dosage_form": meta["dosage_form"],
                            "strength": meta["strength"], "classification": meta["classification"],
                            "similarity": round(r["score"]*100, 1)})
        return jsonify({"similar": similar[:4]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Drug Interaction ─────────────────────────────────────────
@app.route("/api/interaction", methods=["POST"])
def drug_interaction():
    try:
        data = request.json
        medicine1 = data.get("medicine1","").strip()
        medicine2 = data.get("medicine2","").strip()
        if not medicine1 or not medicine2:
            return jsonify({"error": "Please enter both medicine names."}), 400
        prompt = f"""You are a clinical pharmacist. A patient is taking '{medicine1}' and '{medicine2}' together.
Respond in this exact format:
STATUS: [SAFE / CAUTION / DANGEROUS]
INTERACTION: [one sentence]
EFFECTS: [what can happen]
RECOMMENDATION: [what patient should do]"""
        ai_response = query_grok(prompt)
        status = "DANGEROUS" if "DANGEROUS" in ai_response.upper() else "CAUTION" if "CAUTION" in ai_response.upper() else "SAFE"
        return jsonify({"response": ai_response, "status": status})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Side Effects ─────────────────────────────────────────────
@app.route("/api/side-effects", methods=["POST"])
def side_effects():
    try:
        data = request.json
        medicine_name = data.get("medicine","").strip()
        age_group = data.get("age_group","Adult")
        if not medicine_name:
            return jsonify({"error": "Medicine name is required."}), 400
        prompt = f"""You are a clinical pharmacist. List the side effects of '{medicine_name}' for a {age_group} patient.
Respond ONLY in this exact JSON format with no extra text:
{{
  "serious": ["side effect 1", "side effect 2", "side effect 3"],
  "mild": ["side effect 1", "side effect 2", "side effect 3"],
  "common": ["side effect 1", "side effect 2", "side effect 3"],
  "warning": "One important warning sentence for this age group."
}}
serious = life threatening (max 4), mild = noticeable but not dangerous (max 4), common = very common and harmless (max 4)
Keep each side effect to 3-5 words max."""
        ai_response = query_grok(prompt)
        json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
        if json_match:
            effects_data = json.loads(json_match.group())
        else:
            effects_data = {
                "serious": ["Severe allergic reaction", "Difficulty breathing", "Chest pain"],
                "mild": ["Headache", "Dizziness", "Fatigue"],
                "common": ["Nausea", "Dry mouth", "Mild rash"],
                "warning": "Consult your doctor if any side effects persist."
            }
        return jsonify(effects_data)
    except Exception as e:
        return jsonify({
            "serious": ["Severe allergic reaction","Difficulty breathing"],
            "mild": ["Headache","Dizziness"],
            "common": ["Nausea","Dry mouth"],
            "warning": "Consult your doctor if any side effects persist."
        })


# ── Analytics ────────────────────────────────────────────────
@app.route("/api/analytics", methods=["GET"])
def get_analytics():
    try:
        conn = get_db(); cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT COUNT(*) as total FROM queries")
        total = cursor.fetchone()["total"]
        cursor.execute("""SELECT SUBSTRING_INDEX(user_input,' - ',1) as medicine, COUNT(*) as count
            FROM queries GROUP BY medicine ORDER BY count DESC LIMIT 5""")
        top_medicines = cursor.fetchall()
        cursor.execute("""SELECT DATE(created_at) as date, COUNT(*) as count FROM queries
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at) ORDER BY date ASC""")
        daily_searches = cursor.fetchall()
        for row in daily_searches:
            if row["date"]: row["date"] = str(row["date"])
        cursor.close(); conn.close()
        return jsonify({"total": total, "top_medicines": top_medicines, "daily_searches": daily_searches})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── History ──────────────────────────────────────────────────
@app.route("/api/history", methods=["GET"])
def get_history():
    conn = get_db(); cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM queries ORDER BY created_at DESC LIMIT 10")
    history = cursor.fetchall(); cursor.close(); conn.close()
    return jsonify(history)

@app.route("/api/history/<int:query_id>", methods=["DELETE"])
def delete_history(query_id):
    try:
        conn = get_db(); cursor = conn.cursor()
        cursor.execute("DELETE FROM queries WHERE id = %s", (query_id,))
        conn.commit(); cursor.close(); conn.close()
        return jsonify({"message": "Deleted successfully."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)