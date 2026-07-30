/* ===========================================================
   DAM SHOES — Vitrine "Em Destaque" (esteira em movimento)
   Arquivo independente. Carregue DEPOIS de supabase.js e app.js:
     <script src="destaques.js"></script>
   Requer a coluna booleana `destaque` na tabela de produtos.
   =========================================================== */
(function () {
  "use strict";

  var TABELA = "produtos";        // <- troque para "products" se for esse o nome da sua tabela
  var VELOCIDADE = 6;             // segundos que cada card leva para atravessar (maior = mais lento)

  /* --- acha o client do Supabase que o app.js já criou --- */
  function acharClient() {
    var candidatos = ["supabase", "supabaseClient", "sb", "db", "client", "sbClient"];
    for (var i = 0; i < candidatos.length; i++) {
      var c = window[candidatos[i]];
      if (c && typeof c.from === "function") return c;
    }
    for (var k in window) {
      try {
        var v = window[k];
        if (v && typeof v === "object" && typeof v.from === "function" && v.auth) return v;
      } catch (e) {}
    }
    return null;
  }

  /* --- normaliza um produto vindo do banco --- */
  function normalizar(p) {
    var fotos = p.images || p.fotos || p.photos || p.imagens || [];
    if (typeof fotos === "string") {
      try { fotos = JSON.parse(fotos); } catch (e) { fotos = [fotos]; }
    }
    if (!Array.isArray(fotos)) fotos = [];
    var capa = fotos[0] || p.image || p.foto || p.image_url || "";
    return {
      id: p.id,
      nome: p.name || p.nome || "Produto",
      marca: p.brand || p.marca || "",
      preco: Number(p.price != null ? p.price : p.preco) || 0,
      precoAntigo: Number(p.price_old != null ? p.price_old : p.preco_antigo) || 0,
      status: p.status || "available",
      capa: capa
    };
  }

  function brl(v) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function escapar(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* --- monta um card --- */
  function montarCard(p) {
    var esgotado = p.status === "esgotado";
    var el = document.createElement("button");
    el.type = "button";
    el.className = "destaque-card";
    el.setAttribute("data-id", p.id);
    el.setAttribute("aria-label", "Ver " + p.nome);
    el.innerHTML =
      '<div class="destaque-thumb">' +
        '<span class="destaque-flag' + (esgotado ? " esgotado" : "") + '">' +
          (esgotado ? "Esgotado" : "Destaque") +
        "</span>" +
        (p.capa
          ? '<img src="' + escapar(p.capa) + '" alt="' + escapar(p.nome) + '" loading="lazy" />'
          : "") +
      "</div>" +
      '<div class="destaque-info">' +
        (p.marca ? '<div class="destaque-brand">' + escapar(p.marca) + "</div>" : "") +
        '<div class="destaque-name">' + escapar(p.nome) + "</div>" +
        '<div class="destaque-prices">' +
          (p.precoAntigo > p.preco
            ? '<span class="destaque-price-old">' + brl(p.precoAntigo) + "</span>"
            : "") +
          '<span class="destaque-price">' + brl(p.preco) + "</span>" +
        "</div>" +
      "</div>";

    el.addEventListener("click", function () { abrirProduto(p.id); });
    return el;
  }

  /* --- abre o modal do produto reaproveitando o que o app.js já faz --- */
  function abrirProduto(id) {
    var fns = ["openProduct", "openProductModal", "abrirProduto", "showProduct"];
    for (var i = 0; i < fns.length; i++) {
      if (typeof window[fns[i]] === "function") {
        try { window[fns[i]](id); return; } catch (e) {}
      }
    }
    // fallback: rola até o card no catálogo e clica nele
    var card = document.querySelector('#products-grid [data-id="' + id + '"]');
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(function () { card.click(); }, 400);
    } else {
      var cat = document.getElementById("catalog");
      if (cat) cat.scrollIntoView({ behavior: "smooth" });
    }
  }

  /* --- renderiza a esteira --- */
  function renderizar(produtos) {
    var secao = document.getElementById("destaques");
    var track = document.getElementById("destaques-track");
    if (!secao || !track) return;

    if (!produtos.length) { secao.style.display = "none"; return; }
    secao.style.display = "";
    track.innerHTML = "";

    // duplica a lista para o loop ficar contínuo (o CSS anda -50%)
    for (var volta = 0; volta < 2; volta++) {
      produtos.forEach(function (p) {
        var card = montarCard(p);
        if (volta === 1) card.setAttribute("aria-hidden", "true");
        track.appendChild(card);
      });
    }

    track.style.setProperty("--destaques-duration", produtos.length * VELOCIDADE + "s");
  }

  /* --- busca no Supabase --- */
  function carregar() {
    var sb = acharClient();
    if (!sb) {
      console.warn("[destaques] Cliente Supabase não encontrado. Carregue destaques.js depois do app.js.");
      return;
    }
    sb.from(TABELA)
      .select("*")
      .eq("destaque", true)
      .then(function (res) {
        if (res.error) {
          console.error("[destaques] Erro ao buscar:", res.error.message);
          return;
        }
        renderizar((res.data || []).map(normalizar));
      });
  }

  window.recarregarDestaques = carregar;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", carregar);
  } else {
    carregar();
  }
})();
