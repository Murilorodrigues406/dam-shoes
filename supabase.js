// ═══════════════════════════════════════════════════
// SUPABASE CONFIG — DAM Shoes
// ═══════════════════════════════════════════════════
// ATENÇÃO: use apenas a chave anon/public aqui.
// NUNCA coloque a service_role key no front-end.
// ═══════════════════════════════════════════════════

const SUPABASE_URL  = 'https://bblnkvvygaofgqmpdbvf.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJibG5rdnZ5Z2FvZmdxbXBkYnZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDUyNTIsImV4cCI6MjA5NDc4MTI1Mn0.jksuqI2kNU1QhSdx5E41s56GajWFI4r_koIN0B-TURg';

// Senha do painel admin — TROQUE para uma senha sua
const ADMIN_PASSWORD = 'damshoes2025';

// WhatsApp padrão da loja
const WHATSAPP = '5591996247783';

// Inicializa cliente Supabase (carregado via CDN no HTML)
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
