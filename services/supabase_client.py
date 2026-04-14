from supabase import create_client, Client
from core.config import config

supabase: Client = None

def get_supabase() -> Client:
    global supabase
    if supabase is None:
        supabase = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)
    return supabase
