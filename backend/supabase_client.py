import os
import logging

try:
    from supabase import create_client
except Exception:
    create_client = None

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')


def get_admin_client():
    """Return a Supabase client using the service role key for privileged operations."""
    if create_client is None:
        logging.warning('supabase-py not installed; supabase client unavailable')
        return None
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        logging.warning('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set')
        return None
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def get_user_from_access_token(access_token: str):
    """Return user dict from access token using admin client."""
    client = get_admin_client()
    if not client:
        logging.error('get_user_from_access_token: admin client is None')
        return None
    try:
        logging.info(f'Attempting to validate token (first 20 chars): {access_token[:20]}...')
        
        # Try new SDK method
        if hasattr(client.auth, 'get_user'):
            res = client.auth.get_user(access_token)
            logging.info(f'get_user response type: {type(res)}')
            
            # Handle AuthResponse object
            if hasattr(res, 'user'):
                logging.info(f'Found user attribute on response: {res.user}')
                return res.user
            
            # Handle dict response
            if isinstance(res, dict):
                if res.get('data') and res['data'].get('user'):
                    return res['data']['user']
                elif res.get('user'):
                    return res.get('user')
                else:
                    logging.warning(f'Unexpected dict structure: {res}')
                    return res
            
            logging.warning(f'Unexpected response type: {type(res)}')
            return res
        
        # Fallback to old SDK method
        elif hasattr(client.auth, 'api') and hasattr(client.auth.api, 'get_user'):
            res = client.auth.api.get_user(access_token)
            logging.info(f'api.get_user response: {res}')
            return res
        
        else:
            logging.error('Neither get_user nor api.get_user available on client.auth')
            return None
            
    except Exception as e:
        logging.error(f'get_user_from_access_token error: {e}', exc_info=True)
        return None
