from flask import Blueprint, jsonify, request
import logging

from supabase_client import get_admin_client, get_user_from_access_token

api_bp = Blueprint('api', __name__, url_prefix='/api')


def _get_user_from_header(req):
    """Extract and validate user from Authorization header."""
    auth = req.headers.get('Authorization') or req.headers.get('authorization')
    if not auth:
        return None
    
    token = auth.split(' ', 1)[1].strip() if auth.lower().startswith('bearer ') else auth.strip()
    user_obj = get_user_from_access_token(token)
    
    if not user_obj:
        return None
    
    try:
        uid = user_obj.get('id') if isinstance(user_obj, dict) else getattr(user_obj, 'id', None)
        return str(uid) if uid else None
    except Exception:
        return None


# ============= AUTHENTICATION ROUTES =============

@api_bp.route('/auth/me', methods=['GET', 'OPTIONS'])
def auth_me():
    """Get current authenticated user info."""
    if request.method == 'OPTIONS':
        return ('', 200)
    
    try:
        user_id = _get_user_from_header(request)
        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401
        
        client = get_admin_client()
        if not client:
            return jsonify({"error": "Database unavailable"}), 503
        
        # Fetch user from Supabase users table
        res = client.table('users').select('*').eq('uuid', user_id).execute()
        users = res.data if hasattr(res, 'data') else []
        
        if not users:
            return jsonify({"error": "User not found"}), 404
        
        user_data = users[0]
        logging.info(f'✅ [auth/me] User found: email={user_data.get("email")}, role={user_data.get("role")}')
        return jsonify(user_data), 200
        
    except Exception as e:
        logging.exception('auth_me error')
        return jsonify({"error": str(e)}), 500


@api_bp.route('/auth/create_user', methods=['POST', 'OPTIONS'])
def auth_create_user():
    """Idempotent endpoint: ensure a row exists in the custom users table for the
    authenticated Supabase user. Returns was_inaugural_login: true if row was just created,
    false if it already existed."""
    if request.method == 'OPTIONS':
        return ('', 200)
    
    try:
        payload = request.get_json(force=True) or {}
        email = payload.get('email')
        screenname = payload.get('screenname') or (email.split('@')[0] if isinstance(email, str) and '@' in email else None)
        
        logging.info(f'auth_create_user called with email: {email}')
        logging.info(f'Authorization header present: {bool(request.headers.get("Authorization"))}')
        
        uid = _get_user_from_header(request)
        if not uid:
            logging.error('auth_create_user: failed to extract uid from header')
            return jsonify({'error': 'unauthorized', 'message': 'Failed to validate JWT token'}), 401
        
        client = get_admin_client()
        if not client:
            return jsonify({'error': 'supabase client missing'}), 500
        
        # Check if user already exists by uuid
        try:
            rc = client.table('users').select('uuid,email').eq('uuid', uid).limit(1).execute()
            rows = rc.data if hasattr(rc, 'data') else (rc.get('data') if isinstance(rc, dict) else None)
            if rows and len(rows) > 0:
                return jsonify({'success': True, 'uuid': uid, 'was_inaugural_login': False}), 200
        except Exception:
            pass
        
        # Check if user exists by email
        if email:
            try:
                rc2 = client.table('users').select('uuid,email').eq('email', email).limit(1).execute()
                r2 = rc2.data if hasattr(rc2, 'data') else (rc2.get('data') if isinstance(rc2, dict) else None)
                if r2 and len(r2) > 0:
                    return jsonify({'success': True, 'uuid': r2[0].get('uuid'), 'was_inaugural_login': False}), 200
            except Exception:
                pass
        
        # Insert new user
        resolved_screen = screenname or (email.split('@')[0] if email and '@' in email else str(uid))
        insert_payload = {
            'uuid': uid,
            'email': email or None,
            'screenname': resolved_screen,
            'role': 'STAFF',
            'approved': False,
        }
        
        try:
            ins = client.table('users').insert(insert_payload).execute()
            return jsonify({'success': True, 'uuid': uid, 'was_inaugural_login': True}), 200
        except Exception as e:
            logging.exception('auth_create_user insert error')
            # Race condition: check if row was created by another request
            try:
                rc3 = client.table('users').select('uuid').eq('uuid', uid).limit(1).execute()
                r3 = rc3.data if hasattr(rc3, 'data') else (rc3.get('data') if isinstance(rc3, dict) else None)
                if r3 and len(r3) > 0:
                    return jsonify({'success': True, 'uuid': uid, 'was_inaugural_login': False}), 200
            except Exception:
                pass
            return jsonify({'error': str(e), 'was_inaugural_login': False}), 500
    except Exception as exc:
        logging.exception('auth_create_user error')
        return jsonify({'error': str(exc)}), 500


@api_bp.route('/auth/upsert-user', methods=['POST', 'OPTIONS'])
def auth_upsert_user():
    """Update user's screenname and/or role after inaugural login."""
    if request.method == 'OPTIONS':
        return ('', 200)
    
    try:
        data = request.get_json(force=True) or {}
        uuid = data.get('uuid') or data.get('user_id')
        email = data.get('email')
        screenname = data.get('screenname') or data.get('screen_name') or data.get('username')
        role = data.get('role')
        
        # Get uuid from token if not provided
        if not uuid:
            uuid = _get_user_from_header(request)
        
        if not uuid:
            return jsonify({'error': 'uuid required'}), 400
        
        client = get_admin_client()
        if not client:
            return jsonify({'error': 'supabase client missing'}), 500
        
        # Build update payload
        update_payload = {}
        if screenname:
            update_payload['screenname'] = screenname
        if role and role in ['STAFF', 'DOCTOR']:
            update_payload['role'] = role
        if email:
            update_payload['email'] = email
        
        if not update_payload:
            return jsonify({'error': 'provide at least screenname, role, or email'}), 400
        
        # Upsert user
        try:
            # Check if exists
            res = client.table('users').select('uuid').eq('uuid', uuid).limit(1).execute()
            exists = res.data if hasattr(res, 'data') else []
            
            if exists:
                # Update
                client.table('users').update(update_payload).eq('uuid', uuid).execute()
            else:
                # Insert
                insert_payload = {
                    'uuid': uuid,
                    'email': email or None,
                    'screenname': screenname or (email.split('@')[0] if email and '@' in email else str(uuid)),
                    'role': role or 'STAFF',
                }
                client.table('users').insert(insert_payload).execute()
            
            return jsonify({'success': True, 'uuid': uuid}), 200
        except Exception as e:
            logging.exception('auth_upsert_user error')
            return jsonify({'error': str(e)}), 500
    except Exception as exc:
        logging.exception('auth_upsert_user outer error')
        return jsonify({'error': str(exc)}), 500


# ============= PLACEHOLDER ROUTES =============

@api_bp.route('/home', methods=['GET', 'OPTIONS'])
def home():
    """Homepage data endpoint - PLACEHOLDER."""
    if request.method == 'OPTIONS':
        return ('', 200)
    
    return jsonify({
        "message": "Welcome to Medicare Clinic App",
        "version": "1.0.0"
    }), 200


@api_bp.route('/dashboard', methods=['GET', 'OPTIONS'])
def dashboard():
    """Dashboard data endpoint - PLACEHOLDER."""
    if request.method == 'OPTIONS':
        return ('', 200)
    
    try:
        user_id = _get_user_from_header(request)
        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Add dashboard logic here
        return jsonify({
            "message": "Dashboard data",
            "user_id": user_id
        }), 200
        
    except Exception as e:
        logging.exception('dashboard error')
        return jsonify({"error": str(e)}), 500


# ============= FINANCIAL STATS ROUTES =============

@api_bp.route('/financials/monthly-stats', methods=['GET', 'OPTIONS'])
def monthly_stats():
    """Get monthly breakdown statistics - SIMPLE AND CLEAN."""
    if request.method == 'OPTIONS':
        return ('', 200)
    
    try:
        from datetime import datetime
        import calendar
        
        client = get_admin_client()
        if not client:
            return jsonify({"error": "Database unavailable"}), 503
        
        # Fetch ALL visits - you set limit to 50000 so just pull everything
        visits_response = client.table('visits').select('date, consultation_fee, drug_fee, Procedure_Fee, new_old, referral').execute()
        visits_data = visits_response.data if hasattr(visits_response, 'data') else []
        logging.info(f'Fetched {len(visits_data)} total visits')
        
        # Fetch ALL medicines
        medicines_response = client.table('medicines').select('date, drug_fee').execute()
        medicines_data = medicines_response.data if hasattr(medicines_response, 'data') else []
        logging.info(f'Fetched {len(medicines_data)} total medicine records')
        
        # Group by month
        monthly_map = {}
        
        # Process visits - COUNT visits and SUM fees
        for visit in visits_data:
            date_str = visit.get('date')
            if not date_str:
                continue
            
            # Parse date
            try:
                if 'T' in date_str:
                    date_obj = datetime.fromisoformat(date_str.replace('Z', '').replace('+00:00', ''))
                else:
                    date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            except:
                continue
            
            month_key = f"{date_obj.year}-{date_obj.month:02d}"
            
            # Initialize month if not exists
            if month_key not in monthly_map:
                monthly_map[month_key] = {
                    'month': month_key,
                    'totalVisits': 0,
                    'drugVisits': 0,
                    'totalRevenue': 0,
                    'newPatients': 0,
                    'googleReferrals': 0,
                }
            
            # COUNT visits
            monthly_map[month_key]['totalVisits'] += 1
            
            # SUM revenue from visits table: consultation_fee + drug_fee + Procedure_Fee
            consultation_fee = float(visit.get('consultation_fee') or 0)
            drug_fee = float(visit.get('drug_fee') or 0)
            procedure_fee = float(visit.get('Procedure_Fee') or 0)
            monthly_map[month_key]['totalRevenue'] += consultation_fee + drug_fee + procedure_fee
            
            # COUNT new patients where new_old = 'N'
            new_old_val = str(visit.get('new_old') or '').strip().upper()
            if new_old_val == 'N':
                monthly_map[month_key]['newPatients'] += 1
            
            # COUNT Google referrals (case insensitive)
            referral = str(visit.get('referral') or '').lower()
            if 'google' in referral:
                monthly_map[month_key]['googleReferrals'] += 1
        
        # Process medicines - COUNT drug visits and SUM drug_fee
        for medicine in medicines_data:
            date_str = medicine.get('date')
            if not date_str:
                continue
            
            # Parse date
            try:
                if 'T' in date_str:
                    date_obj = datetime.fromisoformat(date_str.replace('Z', '').replace('+00:00', ''))
                else:
                    date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            except:
                continue
            
            month_key = f"{date_obj.year}-{date_obj.month:02d}"
            
            # Initialize month if not exists
            if month_key not in monthly_map:
                monthly_map[month_key] = {
                    'month': month_key,
                    'totalVisits': 0,
                    'drugVisits': 0,
                    'totalRevenue': 0,
                    'newPatients': 0,
                    'googleReferrals': 0,
                }
            
            # COUNT drug visits
            monthly_map[month_key]['drugVisits'] += 1
            
            # SUM revenue from medicines table: drug_fee
            drug_fee = float(medicine.get('drug_fee') or 0)
            monthly_map[month_key]['totalRevenue'] += drug_fee
        
        # Calculate avg daily revenue for each month
        result = []
        for month_key, stats in monthly_map.items():
            year, month = map(int, month_key.split('-'))
            days_in_month = calendar.monthrange(year, month)[1]
            stats['avgDailyRevenue'] = stats['totalRevenue'] / days_in_month
            result.append(stats)
        
        # Sort by month descending (most recent first)
        result.sort(key=lambda x: x['month'], reverse=True)
        
        logging.info(f"Returning {len(result)} months of data")
        
        return jsonify(result), 200
        
    except Exception as e:
        logging.exception('monthly_stats error')
        return jsonify({"error": str(e)}), 500


# ============= ACTIVITY LOGS ROUTES =============

@api_bp.route('/activity-logs', methods=['GET', 'OPTIONS'])
def get_activity_logs():
    """Get paginated activity logs with user details and filters."""
    if request.method == 'OPTIONS':
        return ('', 200)
    
    try:
        user_id = _get_user_from_header(request)
        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401
        
        client = get_admin_client()
        if not client:
            return jsonify({"error": "Database unavailable"}), 503
        
        # Get pagination params
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        from_idx = (page - 1) * per_page
        to_idx = from_idx + per_page - 1
        
        # Get filter params
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        user_uuid = request.args.get('user_uuid')
        
        # Build query
        query = client.table('activity_logs').select('*', count='exact')
        
        # Apply filters
        if date_from:
            query = query.gte('created_at', f"{date_from}T00:00:00")
        if date_to:
            query = query.lte('created_at', f"{date_to}T23:59:59")
        if user_uuid:
            query = query.eq('user_uuid', user_uuid)
        
        # Fetch logs with count
        logs_response = query.order('created_at', desc=True).range(from_idx, to_idx).execute()
        logs_data = logs_response.data if hasattr(logs_response, 'data') else []
        total_count = logs_response.count if hasattr(logs_response, 'count') else 0
        
        # Get unique user UUIDs
        user_uuids = list(set([log.get('user_uuid') for log in logs_data if log.get('user_uuid')]))
        
        # Fetch user details
        users_map = {}
        if user_uuids:
            users_response = client.table('users').select('uuid, screenname, email').in_('uuid', user_uuids).execute()
            users_data = users_response.data if hasattr(users_response, 'data') else []
            for user in users_data:
                users_map[user['uuid']] = {
                    'screenname': user.get('screenname'),
                    'email': user.get('email')
                }
        
        # Enrich logs with user info
        enriched_logs = []
        for log in logs_data:
            user_uuid = log.get('user_uuid')
            user_info = users_map.get(user_uuid, {})
            enriched_logs.append({
                'log_id': log.get('log_id'),
                'action': log.get('action'),
                'created_at': log.get('created_at'),
                'user_name': user_info.get('screenname') or user_info.get('email') or 'Unknown User'
            })
        
        return jsonify({
            'logs': enriched_logs,
            'total': total_count,
            'page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        logging.exception('activity_logs error')
        return jsonify({"error": str(e)}), 500


