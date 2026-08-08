import os
import json
import logging
from datetime import date, timedelta
from flask import Blueprint, jsonify, request
from supabase_client import get_admin_client

chatbot_bp = Blueprint('chatbot', __name__, url_prefix='/api')

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

SYSTEM_PROMPT = """You are **Scorp**, the intelligent data assistant for **Dr. Karthika Skin Care Clinic** — a dermatology clinic.

YOUR PERSONALITY:
- Sharp, friendly, conversational — like a smart colleague who knows every single row in the database.
- Give complete, accurate answers. Never say "I don't have the data" if the data is in your context.
- Use emoji sparingly (✅, 📊, 💊).

WHAT YOU CAN DO:
- Answer ANY question about clinic data: patients, visits, prescriptions, medicines, diagnoses, financials, statistics, trends, aggregations, comparisons, rankings.
- Perform calculations: totals, averages, counts, group-bys, rankings, comparisons across dates/months/patients.
- Full patient profiles: visit history, diagnoses, prescribed medicines, fees paid, review dates.
- Financial analysis: revenue breakdowns (consultation, drug, procedure), payment methods, daily/monthly/yearly trends.
- Clinical analysis: most common diagnoses, most prescribed medicines, prescription patterns.

WHAT YOU CANNOT DO:
- Answer questions completely unrelated to this clinic. Say: "That's outside my lane! Ask me about patients, visits, prescriptions, or financials 🩺"

CRITICAL RULES:
1. **ALWAYS do arithmetic correctly.** Double-check every total by summing each value explicitly.
2. **Procedure revenue**: ANY visit row where Procedure_Fee > 0 counts as procedure revenue. Sum ALL such rows — don't skip any.
3. **Drug revenue has TWO sources:**
   - visits.drug_fee = drugs given during a consultation visit
   - medicines.drug_fee = drugs given in a drug-only visit (no consultation)
   - Total drug revenue = SUM of BOTH.
4. **Total clinic revenue** = SUM(visits.consultation_fee) + SUM(visits.drug_fee) + SUM(visits.Procedure_Fee) + SUM(medicines.drug_fee)
5. **new_old column**: 'N'/'NEW' = new patient, 'O'/'OLD' = returning patient.
6. **Format currency as ₹** with commas.
7. **NEVER say you can't find data that is present in the context.** Search through ALL the data provided to you.
8. **For "most visits" queries**: Count occurrences of each patient_id in the visits data and rank them. This is simple counting — do it exhaustively for ALL rows given.
9. **For medicine queries**: ALWAYS follow the chain: visit → prescription (via visit_id) → prescription_medicines (via prescription_id). The medicines ARE in the data — find them.
10. **Date filtering**: The date column is text in YYYY-MM-DD format. To filter by year, check if date starts with that year. For month, check date starts with YYYY-MM.

EXACT DATABASE SCHEMA (these are the real column names — use them exactly):

**patients** — Master patient records
  patient_id (PK), name, sex ('M'/'F'), phone_no, year_of_birth, dob, pic_filename, hometown

**visits** — Consultation visit records
  visit_id (PK), patient_id (FK→patients), date (text YYYY-MM-DD), fullname, age, consultation_type, consultation_fee (float), drug_fee (float), Procedure_Fee (float), weight, blood_pressure, pulse, rbs (random blood sugar; NULL on visits recorded before it was added), extra_procedures (text describing procedure name), new_old, paymentmethod, referral, created_at

**medicines** — Drug-only visit records (patient came ONLY for medicines, no consultation)
  med_id (PK), patient_id (FK→patients), patient_name, date, drug_fee, payment_method, created_at

**prescriptions** — One prescription per consultation visit
  prescription_id (PK), visit_id (FK→visits), diagnosis, symptoms, findings, procedures, instructions, review_date, investigations, created_at

**prescription_medicines** — Individual medicines prescribed (the actual drugs)
  medicine_id (PK, serial), prescription_id (FK→prescriptions), medicine_name (text), areasite (text), duration (text), time (text), quantity (text)
  NOTE: medicine_id is the primary key, NOT id. The columns are: medicine_id, prescription_id, medicine_name, areasite, duration, time, quantity.

RELATIONSHIP CHAINS:
- Patient's diagnoses: patients → visits (patient_id) → prescriptions (visit_id) → diagnosis
- Patient's prescribed medicines: patients → visits (patient_id) → prescriptions (visit_id) → prescription_medicines (prescription_id) → medicine_name, quantity, duration, areasite, time
- Patient's visit count: COUNT rows in visits where patient_id matches
- Procedure revenue: SUM of Procedure_Fee from ALL visits where Procedure_Fee > 0. The extra_procedures column tells you WHAT procedure was done.

RESPONSE STYLE:
- Be thorough. Include ALL relevant data — don't summarize away details.
- For lists, use clean numbered formatting.
- Show your work on calculations when there are multiple items to sum.
- If asked about a patient, include their diagnosis, medicines, fees — the full picture.
- NEVER say "I don't have the data" or "data retrieval issue" — the data IS in your context. Look harder."""


def _fetch_clinic_context(client, user_query, history_context=""):
    """Aggressively fetch clinic data. Better to over-fetch than miss data."""
    context_parts = []
    query_lower = (user_query + " " + history_context).lower()
    today_str = date.today().isoformat()

    try:
        # ── Always: summary counts ──
        patients_res = client.table('patients').select('patient_id', count='exact').execute()
        patient_count = patients_res.count if hasattr(patients_res, 'count') and patients_res.count else len(patients_res.data or [])
        visits_res = client.table('visits').select('visit_id', count='exact').execute()
        visit_count = visits_res.count if hasattr(visits_res, 'count') and visits_res.count else len(visits_res.data or [])
        meds_res = client.table('medicines').select('med_id', count='exact').execute()
        med_count = meds_res.count if hasattr(meds_res, 'count') and meds_res.count else len(meds_res.data or [])
        context_parts.append(f"CLINIC TOTALS: {patient_count} patients, {visit_count} consultation visits, {med_count} drug-only visits. Today: {today_str}")

        # ── Always fetch ALL visits — this is the core table ──
        all_visits = client.table('visits').select(
            'visit_id, patient_id, fullname, date, age, consultation_type, consultation_fee, drug_fee, Procedure_Fee, paymentmethod, new_old, extra_procedures, referral, weight, blood_pressure, pulse, rbs'
        ).order('date', desc=True).limit(5000).execute()
        if all_visits.data:
            context_parts.append(f"ALL VISITS ({len(all_visits.data)} rows):\n{json.dumps(all_visits.data, default=str)}")

        # ── Always fetch ALL medicine-only visits ──
        all_meds = client.table('medicines').select(
            'med_id, patient_id, patient_name, date, drug_fee, payment_method'
        ).order('date', desc=True).limit(5000).execute()
        if all_meds.data:
            context_parts.append(f"ALL DRUG-ONLY VISITS ({len(all_meds.data)} rows):\n{json.dumps(all_meds.data, default=str)}")

        # ── Always fetch ALL prescriptions ──
        all_prescriptions = client.table('prescriptions').select(
            'prescription_id, visit_id, diagnosis, symptoms, findings, procedures, instructions, review_date, investigations'
        ).order('prescription_id', desc=True).limit(5000).execute()
        if all_prescriptions.data:
            context_parts.append(f"ALL PRESCRIPTIONS ({len(all_prescriptions.data)} rows):\n{json.dumps(all_prescriptions.data, default=str)}")

        # ── Always fetch ALL prescription_medicines ──
        all_rx_meds = client.table('prescription_medicines').select(
            'medicine_id, prescription_id, medicine_name, quantity, time, areasite, duration'
        ).order('medicine_id', desc=True).limit(10000).execute()
        if all_rx_meds.data:
            context_parts.append(f"ALL PRESCRIPTION MEDICINES ({len(all_rx_meds.data)} rows):\n{json.dumps(all_rx_meds.data, default=str)}")

        # ── Always fetch ALL patients ──
        all_patients = client.table('patients').select(
            'patient_id, name, sex, phone_no, year_of_birth, dob, hometown'
        ).order('patient_id', desc=True).limit(5000).execute()
        if all_patients.data:
            context_parts.append(f"ALL PATIENTS ({len(all_patients.data)} rows):\n{json.dumps(all_patients.data, default=str)}")

    except Exception as e:
        logging.exception('Error fetching clinic context')
        context_parts.append(f"Error fetching some data: {str(e)}")

    return "\n\n".join(context_parts)


@chatbot_bp.route('/chatbot', methods=['POST', 'OPTIONS'])
def chatbot():
    """Handle chatbot queries using OpenAI with clinic data context."""
    if request.method == 'OPTIONS':
        return ('', 200)

    if not OPENAI_API_KEY:
        return jsonify({"error": "OpenAI API key not configured. Add OPENAI_API_KEY to backend .env"}), 503

    try:
        import httpx
    except ImportError:
        return jsonify({"error": "httpx not installed on server"}), 503

    data = request.get_json()
    if not data or not data.get('message'):
        return jsonify({"error": "Message is required"}), 400

    user_message = data['message'].strip()
    if not user_message:
        return jsonify({"error": "Message cannot be empty"}), 400

    if len(user_message) > 2000:
        return jsonify({"error": "Message too long (max 2000 characters)"}), 400

    conversation_history = data.get('history', [])

    # Build history context string for smarter data fetching
    history_context = " ".join([m.get('content', '') for m in conversation_history[-6:] if m.get('role') == 'user'])

    try:
        client = get_admin_client()
        if not client:
            return jsonify({"error": "Database unavailable"}), 503

        clinic_context = _fetch_clinic_context(client, user_message, history_context)

        # Cap context to stay within model token limits (~120K chars safe for gpt-4.5-preview)
        MAX_CONTEXT_CHARS = 400000
        if len(clinic_context) > MAX_CONTEXT_CHARS:
            clinic_context = clinic_context[:MAX_CONTEXT_CHARS] + "\n\n[Context trimmed for length]"

        messages = [
            {"role": "developer", "content": SYSTEM_PROMPT},
            {"role": "developer", "content": f"CURRENT CLINIC DATA (search through ALL of this to answer):\n\n{clinic_context}"},
        ]

        # Add conversation history (last 10 messages)
        for msg in conversation_history[-10:]:
            if msg.get('role') in ('user', 'assistant'):
                messages.append({"role": msg['role'], "content": msg['content'][:2000]})

        messages.append({"role": "user", "content": user_message})

        response = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "o3",
                "messages": messages,
                "max_completion_tokens": 4000,
            },
            timeout=120.0,
        )

        if response.status_code != 200:
            error_body = response.text[:500]
            logging.error(f"OpenAI API error: {response.status_code} - {error_body}")
            if response.status_code == 429:
                return jsonify({"error": "Rate limit hit — wait a moment and try again."}), 429
            if response.status_code == 401:
                return jsonify({"error": "OpenAI API key is invalid or expired."}), 401
            if response.status_code == 400:
                return jsonify({"error": "Request too large. Try a simpler question."}), 400
            return jsonify({"error": f"AI service error ({response.status_code}). Try again."}), 502

        result = response.json()
        reply = result['choices'][0]['message']['content']

        return jsonify({"reply": reply}), 200

    except httpx.TimeoutException:
        return jsonify({"error": "Scorp took too long thinking. Try again!"}), 504
    except Exception as e:
        logging.exception('chatbot error')
        return jsonify({"error": "Something went wrong. Please try again."}), 500
