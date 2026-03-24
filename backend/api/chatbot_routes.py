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
- You're sharp, friendly, and conversational — like a smart colleague who knows everything about the clinic data.
- Give answers that flow naturally. Don't be robotic or overly formal.
- Use emoji sparingly for warmth (✅, 📊, 💊, etc.) but don't overdo it.

WHAT YOU CAN DO:
- Answer ANY question about clinic data: patients, visits, prescriptions, medicines, diagnoses, financials, statistics, trends, aggregations, comparisons, rankings.
- Perform calculations: totals, averages, counts, group-bys, rankings, comparisons across dates/months/patients.
- Answer about specific patients: their visit history, what they were diagnosed with, what medicines were prescribed, how much they paid, when their next review is.
- Answer financial questions: revenue breakdowns, payment method analysis, daily/monthly/yearly trends.
- Answer clinical questions: most common diagnoses, which medicines are prescribed most, prescription patterns.

WHAT YOU CANNOT DO:
- Answer questions completely unrelated to this clinic (e.g., general knowledge, weather, coding help, personal questions).
- For these, say something like: "That's outside my lane! I'm all about Dr. Karthika's clinic data. Ask me about patients, visits, prescriptions, or financials 🩺"

CRITICAL DATA RULES:
1. **ALWAYS do arithmetic correctly.** Double-check totals. consultation_fee + drug_fee + Procedure_Fee = total for a visit.
2. **Drug revenue has TWO sources:**
   - `visits.drug_fee` = drugs dispensed during a consultation visit
   - `medicines.drug_fee` = drugs dispensed in a drug-only visit (no consultation)
   - When asked about total drug revenue, SUM BOTH sources.
3. **Total clinic revenue** = SUM(visits.consultation_fee) + SUM(visits.drug_fee) + SUM(visits.Procedure_Fee) + SUM(medicines.drug_fee)
4. **Patient visit count** = count from visits table (consultation visits). Drug-only visits are in medicines table.
5. **new_old column**: 'N' or 'NEW' = new patient, 'O' or 'OLD' = returning patient.
6. **Format currency as ₹** with Indian number formatting (e.g., ₹1,23,456).

DATABASE SCHEMA:

**patients** — Master patient records
- patient_id (PK), name, sex ('M'/'F'), phone_no, year_of_birth, dob, pic_filename, hometown

**visits** — Consultation visit records (patient came for a consultation)
- visit_id (PK), patient_id (FK→patients), date, fullname, age, consultation_type (Skin/Hair/Nail/combos/Online/Home Visit), consultation_fee, drug_fee, Procedure_Fee, weight, blood_pressure, pulse, extra_procedures, new_old, paymentmethod (Cash/Card/GPay/combos), referral, created_at

**medicines** — Drug-only visit records (patient came ONLY for medicines, no consultation)
- med_id (PK), patient_id (FK→patients), patient_name, date, drug_fee, payment_method, created_at

**prescriptions** — One prescription per consultation visit
- prescription_id (PK), visit_id (FK→visits), diagnosis, symptoms, findings, procedures, instructions, review_date, investigations, created_at

**prescription_medicines** — Individual medicines in a prescription
- id (PK), prescription_id (FK→prescriptions), medicine_id, medicine_name, dosage, quantity, time (when to take), areasite (frequency like 'Once daily'), duration

RELATIONSHIPS:
patients ← visits (1:many via patient_id)
patients ← medicines (1:many via patient_id)
visits ← prescriptions (1:1 via visit_id)
prescriptions ← prescription_medicines (1:many via prescription_id)

So to find what a patient was diagnosed with: patients → visits (by patient_id) → prescriptions (by visit_id) → diagnosis column.
To find what medicines were prescribed: prescriptions → prescription_medicines (by prescription_id).

RESPONSE STYLE:
- Be conversational and natural. Not a wall of bullet points.
- For lists, use clean formatting but keep it readable.
- For numbers, always verify your arithmetic before responding.
- When discussing a patient, feel free to mention relevant context (diagnosis, medicines, fees) if it helps paint the picture.
- If data is missing or empty, say so honestly — don't fabricate."""


def _fetch_clinic_context(client, user_query, history_context=""):
    """Fetch comprehensive clinic data based on the user's query and conversation history."""
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
        context_parts.append(f"CLINIC TOTALS: {patient_count} patients, {visit_count} consultation visits, {med_count} drug-only visits. Today's date: {today_str}")

        # ── Always: recent visits with full detail ──
        recent_visits = client.table('visits').select(
            'visit_id, patient_id, fullname, date, age, consultation_type, consultation_fee, drug_fee, Procedure_Fee, paymentmethod, new_old, weight, blood_pressure, pulse, extra_procedures, referral'
        ).order('visit_id', desc=True).limit(25).execute()
        if recent_visits.data:
            context_parts.append(f"RECENT 25 CONSULTATION VISITS:\n{json.dumps(recent_visits.data, default=str)}")

        # ── Always: recent medicine-only visits ──
        recent_meds = client.table('medicines').select(
            'med_id, patient_id, patient_name, date, drug_fee, payment_method'
        ).order('med_id', desc=True).limit(15).execute()
        if recent_meds.data:
            context_parts.append(f"RECENT 15 DRUG-ONLY VISITS:\n{json.dumps(recent_meds.data, default=str)}")

        # ── Patient lookups ──
        if any(w in query_lower for w in ['patient', 'name', 'who', 'age', 'gender', 'sex', 'phone', 'referral', 'new patient', 'old patient', 'most visit', 'frequent', 'hometown', 'registered']):
            patients_data = client.table('patients').select(
                'patient_id, name, sex, phone_no, year_of_birth, dob, hometown, pic_filename'
            ).order('patient_id', desc=True).limit(100).execute()
            if patients_data.data:
                context_parts.append(f"PATIENTS (latest 100):\n{json.dumps(patients_data.data, default=str)}")

        # ── Prescription & diagnosis & clinical ──
        if any(w in query_lower for w in ['diagnosis', 'diagnos', 'problem', 'condition', 'symptom', 'finding', 'prescri', 'medicine', 'drug', 'dosage', 'instruct', 'review', 'investigation', 'treatment', 'what was', 'what were', 'prescribed', 'medication']):
            prescriptions = client.table('prescriptions').select(
                'prescription_id, visit_id, diagnosis, symptoms, findings, procedures, instructions, review_date, investigations'
            ).order('prescription_id', desc=True).limit(50).execute()
            if prescriptions.data:
                context_parts.append(f"RECENT 50 PRESCRIPTIONS:\n{json.dumps(prescriptions.data, default=str)}")

            rx_meds = client.table('prescription_medicines').select(
                'id, prescription_id, medicine_name, dosage, quantity, time, areasite, duration'
            ).order('id', desc=True).limit(100).execute()
            if rx_meds.data:
                context_parts.append(f"RECENT 100 PRESCRIBED MEDICINES:\n{json.dumps(rx_meds.data, default=str)}")

        # ── Financial / revenue / payment analysis ──
        if any(w in query_lower for w in ['revenue', 'money', 'income', 'earning', 'fee', 'payment', 'cash', 'card', 'gpay', 'financial', 'total', 'sum', 'average', 'avg', 'paid', 'collected', 'amount', 'rupee', 'how much', 'spend', 'cost', 'expensive', 'cheap']):
            all_visits_fin = client.table('visits').select(
                'visit_id, patient_id, fullname, date, consultation_fee, drug_fee, Procedure_Fee, paymentmethod, new_old'
            ).order('date', desc=True).limit(500).execute()
            if all_visits_fin.data:
                context_parts.append(f"FINANCIAL DATA - VISITS (500):\n{json.dumps(all_visits_fin.data, default=str)}")

            all_meds_fin = client.table('medicines').select(
                'med_id, patient_id, patient_name, date, drug_fee, payment_method'
            ).order('date', desc=True).limit(500).execute()
            if all_meds_fin.data:
                context_parts.append(f"FINANCIAL DATA - DRUG-ONLY VISITS (500):\n{json.dumps(all_meds_fin.data, default=str)}")

        # ── Today-specific ──
        if any(w in query_lower for w in ['today', 'this morning', 'right now', 'current', 'so far']):
            today_visits = client.table('visits').select('*').eq('date', today_str).execute()
            if today_visits.data:
                context_parts.append(f"TODAY'S CONSULTATION VISITS:\n{json.dumps(today_visits.data, default=str)}")
            today_meds = client.table('medicines').select('*').eq('date', today_str).execute()
            if today_meds.data:
                context_parts.append(f"TODAY'S DRUG-ONLY VISITS:\n{json.dumps(today_meds.data, default=str)}")

        # ── Date range / monthly / yearly ──
        if any(w in query_lower for w in ['month', 'weekly', 'daily', 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'this year', 'last year', 'this week', 'last week', 'yesterday', 'last month']):
            all_visit_dates = client.table('visits').select(
                'visit_id, patient_id, fullname, date, consultation_fee, drug_fee, Procedure_Fee, paymentmethod, new_old, consultation_type'
            ).order('date', desc=True).limit(1000).execute()
            if all_visit_dates.data:
                context_parts.append(f"ALL VISITS FOR DATE ANALYSIS (1000):\n{json.dumps(all_visit_dates.data, default=str)}")

            all_med_dates = client.table('medicines').select(
                'med_id, patient_id, patient_name, date, drug_fee, payment_method'
            ).order('date', desc=True).limit(500).execute()
            if all_med_dates.data:
                context_parts.append(f"ALL DRUG-ONLY VISITS FOR DATE ANALYSIS (500):\n{json.dumps(all_med_dates.data, default=str)}")

        # ── Aggregation / ranking queries (most, least, top, highest, etc.) ──
        if any(w in query_lower for w in ['most', 'least', 'top', 'highest', 'lowest', 'rank', 'popular', 'common', 'frequent', 'count', 'how many', 'number of', 'breakdown']):
            # Fetch wider data sets for aggregation
            if 'patient' not in query_lower:  # avoid duplicate patient fetch
                patients_agg = client.table('patients').select(
                    'patient_id, name, sex, hometown'
                ).execute()
                if patients_agg.data:
                    context_parts.append(f"ALL PATIENTS FOR AGGREGATION:\n{json.dumps(patients_agg.data, default=str)}")

            all_visits_agg = client.table('visits').select(
                'visit_id, patient_id, fullname, date, consultation_type, consultation_fee, drug_fee, Procedure_Fee, paymentmethod, new_old'
            ).order('date', desc=True).limit(2000).execute()
            if all_visits_agg.data:
                context_parts.append(f"ALL VISITS FOR AGGREGATION (2000):\n{json.dumps(all_visits_agg.data, default=str)}")

            all_prescriptions_agg = client.table('prescriptions').select(
                'prescription_id, visit_id, diagnosis'
            ).execute()
            if all_prescriptions_agg.data:
                context_parts.append(f"ALL PRESCRIPTIONS FOR AGGREGATION:\n{json.dumps(all_prescriptions_agg.data, default=str)}")

            all_rx_meds_agg = client.table('prescription_medicines').select(
                'prescription_id, medicine_name'
            ).execute()
            if all_rx_meds_agg.data:
                context_parts.append(f"ALL PRESCRIBED MEDICINES FOR AGGREGATION:\n{json.dumps(all_rx_meds_agg.data, default=str)}")

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

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "system", "content": f"CURRENT CLINIC DATA:\n\n{clinic_context}"},
        ]

        # Add conversation history (last 12 messages)
        for msg in conversation_history[-12:]:
            if msg.get('role') in ('user', 'assistant'):
                messages.append({"role": msg['role'], "content": msg['content']})

        messages.append({"role": "user", "content": user_message})

        response = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gpt-4o",
                "messages": messages,
                "temperature": 0.2,
                "max_tokens": 2000,
            },
            timeout=45.0,
        )

        if response.status_code != 200:
            logging.error(f"OpenAI API error: {response.status_code} - {response.text}")
            return jsonify({"error": "AI service error. Please try again."}), 502

        result = response.json()
        reply = result['choices'][0]['message']['content']

        return jsonify({"reply": reply}), 200

    except httpx.TimeoutException:
        return jsonify({"error": "Scorp took too long thinking. Try again!"}), 504
    except Exception as e:
        logging.exception('chatbot error')
        return jsonify({"error": "Something went wrong. Please try again."}), 500
