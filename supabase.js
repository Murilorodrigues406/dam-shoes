// ═══════════════════════════════════════════════════
// SUPABASE CONFIG — DAM Shoes
// ═══════════════════════════════════════════════════
// ATENÇÃO: use apenas a chave anon/public aqui.
// NUNCA coloque a service_role key no front-end.
// ═══════════════════════════════════════════════════
const SUPABASE_URL  = 'https://bblnkvvygaofgqmpdbvf.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJibG5rdnZ5Z2FvZmdxbXBkYnZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDUyNTIsImV4cCI6MjA5NDc4MTI1Mn0.jksuqI2kNU1QhSdx5E41s56GajWFI4r_koIN0B-TURg';

// WhatsApp padrão da loja (FALLBACK — o número real vem da tabela settings)
const WHATSAPP_FALLBACK = '5584994746936';

// Objeto de configuração central — preenchido a partir do banco no load.
// Substitui as antigas variáveis window._cfg_*
const CONFIG = {
  whatsapp:  WHATSAPP_FALLBACK,
  parcelas:  10,
  taxa:      0,
  prazo:     '7 dias úteis',
  hero_img:     '',
  hero_title:   '',
  hero_subtitle:'',
  promo:        '',
};

// Inicializa cliente Supabase (carregado via CDN no HTML)
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
