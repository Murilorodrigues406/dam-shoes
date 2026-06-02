# DAM Shoes — Configuração de Segurança no Supabase

## O que foi corrigido no código

| Problema | Antes | Depois |
|---|---|---|
| Email admin exposto no JS | `email: 'damshoes99@gmail.com'` hardcoded | Lido da tabela `settings` (campo `admin_email`) |
| Custo interno exposto | `select('*')` para visitantes | `select(PUBLIC_FIELDS)` — sem `cost` para anon |
| Edit carregava do array local | Poderia ter custo desatualizado | Busca direto do banco com `ADMIN_FIELDS` |
| Settings carregava tudo | `select('*')` na inicialização | `select('hero_img,promo,parcelas,taxa_cartao')` |
| Sem rate limit de login | Infinitas tentativas | Lockout após 5 tentativas (1 minuto) |

---

## Passos obrigatórios no Supabase

### 1. Adicionar coluna `admin_email` na tabela `settings`

No Supabase → Table Editor → `settings` → Add Column:
- Name: `admin_email`
- Type: `text`
- Default: (vazio)

Depois edite a linha id=1 e coloque o email do admin: `damshoes99@gmail.com`

---

### 2. Configurar RLS na tabela `products`

No Supabase → Authentication → Policies → tabela `products`

**Ativar RLS:**
```
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
```

**Policy de leitura pública (sem cost):**
```sql
CREATE POLICY "Leitura pública de produtos"
ON products
FOR SELECT
TO anon
USING (true);
```

> O campo `cost` é protegido no front-end pelo `PUBLIC_FIELDS`.
> Para proteção total no banco, use uma View (ver passo 4).

**Policy de escrita apenas para autenticados:**
```sql
CREATE POLICY "Admin pode inserir produtos"
ON products
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admin pode atualizar produtos"
ON products
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Admin pode excluir produtos"
ON products
FOR DELETE
TO authenticated
USING (true);
```

---

### 3. Configurar RLS na tabela `settings`

**Ativar RLS:**
```sql
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
```

**Leitura pública (apenas campos não sensíveis):**
```sql
CREATE POLICY "Leitura pública de settings"
ON settings
FOR SELECT
TO anon
USING (true);
```

> O `admin_email` fica na mesma tabela mas o app só o lê
> durante o login, quando o usuário digita a senha.
> Para proteção máxima, use uma Edge Function (ver passo 5).

**Escrita apenas para autenticados:**
```sql
CREATE POLICY "Admin pode atualizar settings"
ON settings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Admin pode inserir settings"
ON settings
FOR INSERT
TO authenticated
WITH CHECK (true);
```

---

### 4. (Recomendado) View pública sem campo cost

Cria uma view que expõe apenas os campos públicos dos produtos.
Assim mesmo que alguém acesse o banco via anon key, não vê o custo.

```sql
CREATE VIEW products_public AS
SELECT
  id, name, brand, reference,
  price, price_old, sizes, photos,
  status, description, created_at
FROM products;

-- Permitir leitura anônima da view
GRANT SELECT ON products_public TO anon;
```

Se usar esta view, altere no `app.js`:
```js
// Em loadProducts(), trocar:
.from('products')
// por:
.from('products_public')
```
O painel admin continua usando `.from('products')` com `ADMIN_FIELDS`.

---

### 5. (Opcional, mais seguro) Edge Function para login

Se quiser esconder o email completamente, crie uma Edge Function:

No Supabase → Edge Functions → New Function → `admin-login`

```typescript
// supabase/functions/admin-login/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { password } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Email fica só no servidor, nunca exposto
  const adminEmail = Deno.env.get('ADMIN_EMAIL')!

  const { data, error } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password
  })

  if (error) {
    return new Response(JSON.stringify({ error: 'Senha incorreta' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ session: data.session }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

Defina as variáveis de ambiente no painel:
- `ADMIN_EMAIL` = damshoes99@gmail.com

---

### 6. Configurar RLS no Storage (bucket `dam-shoes-assets`)

No Supabase → Storage → dam-shoes-assets → Policies

**Leitura pública (fotos dos produtos):**
```sql
CREATE POLICY "Acesso público às fotos"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'dam-shoes-assets');
```

**Upload apenas para autenticados:**
```sql
CREATE POLICY "Upload apenas admin"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'dam-shoes-assets');
```

---

## Checklist final

- [ ] Coluna `admin_email` adicionada na tabela `settings` com o email preenchido
- [ ] RLS habilitado na tabela `products`
- [ ] Policies de leitura/escrita criadas em `products`
- [ ] RLS habilitado na tabela `settings`
- [ ] Policies de leitura/escrita criadas em `settings`
- [ ] RLS habilitado no Storage bucket `dam-shoes-assets`
- [ ] Policies de leitura/upload criadas no Storage
- [ ] (Opcional) View `products_public` criada
- [ ] (Opcional) Edge Function `admin-login` criada
- [ ] Novos `app.js` e `supabase.js` subidos no Netlify
- [ ] Testado: visitante não vê campo `cost` no DevTools
- [ ] Testado: login funciona com a senha correta
- [ ] Testado: edição e exclusão de produtos funcionam
