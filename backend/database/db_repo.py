from supabase_client import get_admin_client


def get_client():
    """Get Supabase admin client."""
    return get_admin_client()


# Example helper function
def fetch_all_records(table_name: str):
    """Fetch all records from a table."""
    client = get_client()
    if not client:
        return []
    
    try:
        res = client.table(table_name).select('*').execute()
        return res.data if hasattr(res, 'data') else []
    except Exception as e:
        print(f"Error fetching from {table_name}: {e}")
        return []


# Add more database helper functions here
