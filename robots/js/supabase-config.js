const SUPABASE_URL = 'https://uotmrjsgioybpzeebzeq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvdG1yanNnaW95YnB6ZWViemVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA5Mzk4ODAsImV4cCI6MjA1NjUxNTg4MH0.Iub8MVLInsF0ojw-ykZgc1Z4dGTwCMlCUA8Vu0Ri58g';

// Create Supabase client correctly
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Add rate limiting
const RATE_LIMIT_MINUTES = 5;
const MAX_UPLOADS_PER_WINDOW = 3; 