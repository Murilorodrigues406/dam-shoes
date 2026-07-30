/* ===========================================================
   DAM SHOES — Vitrine "Em Destaque" (esteira em movimento)
   Arquivo independente. Já vem linkado no index.html revisado.
   Requer a coluna booleana `destaque` na tabela de produtos
   (rode o SQL do guia no Supabase antes de publicar).
   =========================================================== */
(function () {
  "use strict";

  var VELOCIDADE = 6; // segundos por card (maior = mais lento)
  var TABELA = null;  // detectada automaticamente: produtos / products

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

  /* --- descobre o nome da tabela (produtos ou products) --- */
  function detectarTabela(sb) {
    if (TABELA) return Promise.resolve(TABELA);
    var nomes = ["produtos", "products", "produto", "product"];
    var i = 0;
    return new Promise(function (resolve) {
      function tentar() {
        if (i >= nomes.length) { resolve(null); return; }
        var nome = nomes[i++];
        sb.from(nome).select("id").limit(1).then(function (res) {
          if (!res.error) { TABELA = nome; resolve(nome); }
          else tentar();
        });
      }
      tentar();
    });
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

  /* --- abre o modal do produto reaproveitando o app.js --- */
  function abrirProduto(id) {
    var fns = ["openProduct", "openProductModal", "abrirProduto", "showProduct"];
    for (var i = 0; i < fns.length; i++) {
      if (typeof window[fns[i]] === "function") {
        try { window[fns[i]](id); return; } catch (e) {}
      }
    }
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

    for (var volta = 0; volta < 2; volta++) {
      produtos.forEach(function (p) {
        var card = montarCard(p);
        if (volta === 1) card.setAttribute("aria-hidden", "true");
        track.appendChild(card);
      });
    }
    track.style.setProperty("--destaques-duration", produtos.length * VELOCIDADE + "s");
  }

  /* --- busca e mostra os destaques --- */
  function carregar() {
    var sb = acharClient();
    if (!sb) { console.warn("[destaques] Cliente Supabase não encontrado."); return; }
    detectarTabela(sb).then(function (tabela) {
      if (!tabela) { console.warn("[destaques] Tabela de produtos não encontrada."); return; }
      sb.from(tabela).select("*").eq("destaque", true).then(function (res) {
        if (res.error) {
          // coluna ainda não existe? mantém o site funcionando normalmente
          console.warn("[destaques] " + res.error.message + " — rode o SQL do guia no Supabase.");
          return;
        }
        renderizar((res.data || []).map(normalizar));
      });
    });
  }
  window.recarregarDestaques = carregar;

  /* ===========================================================
     Integração com o painel admin (sem precisar editar o app.js)
     - Ao salvar (novo ou edição), grava o checkbox no banco
       localizando o produto pelo nome digitado.
     - Ao abrir a edição, lê o estado atual e marca o checkbox.
     =========================================================== */
  function salvarDestaquePorNome(nome, marcado, tentativa) {
    tentativa = tentativa || 0;
    var sb = acharClient();
    if (!sb || !nome) return;
    detectarTabela(sb).then(function (tabela) {
      if (!tabela) return;
      var colNome = null;
      sb.from(tabela).select("*").limit(1).then(function (probe) {
        var linha = (probe.data && probe.data[0]) || {};
        colNome = ("name" in linha) ? "name" : ("nome" in linha) ? "nome" : "name";
        sb.from(tabela).update({ destaque: marcado }).eq(colNome, nome).select("id")
          .then(function (res) {
            if ((res.error || !res.data || !res.data.length) && tentativa < 3) {
              // produto pode ainda não ter terminado de salvar; tenta de novo
              setTimeout(function () { salvarDestaquePorNome(nome, marcado, tentativa + 1); }, 1500);
            } else {
              carregar();
            }
          });
      });
    });
  }

  function prepararAdmin() {
    var btnAdd = document.getElementById("btn-add-product");
    var btnEdit = document.getElementById("btn-save-edit");

    if (btnAdd) {
      btnAdd.addEventListener("click", function () {
        var nome = (document.getElementById("add-name") || {}).value || "";
        var cb = document.getElementById("add-destaque");
        var marcado = !!(cb && cb.checked);
        if (!nome.trim()) return;
        if (marcado) setTimeout(function () { salvarDestaquePorNome(nome.trim(), true); }, 2000);
      });
    }

    if (btnEdit) {
      btnEdit.addEventListener("click", function () {
        var nome = (document.getElementById("edit-name") || {}).value || "";
        var cb = document.getElementById("edit-destaque");
        if (!nome.trim() || !cb) return;
        setTimeout(function () { salvarDestaquePorNome(nome.trim(), cb.checked); }, 2000);
      });
    }

    // quando o modal de edição abre, busca o estado atual do checkbox
    var overlay = document.getElementById("edit-overlay");
    var inputNome = document.getElementById("edit-name");
    if (overlay && inputNome) {
      var obs = new MutationObserver(function () {
        var visivel = overlay.classList.contains("active") ||
                      overlay.classList.contains("open") ||
                      getComputedStyle(overlay).display !== "none";
        if (!visivel) return;
        setTimeout(function () {
          var nome = inputNome.value;
          var cb = document.getElementById("edit-destaque");
          var sb = acharClient();
          if (!nome || !cb || !sb) return;
          detectarTabela(sb).then(function (tabela) {
            if (!tabela) return;
            sb.from(tabela).select("*").limit(1).then(function (probe) {
              var linha = (probe.data && probe.data[0]) || {};
              var colNome = ("name" in linha) ? "name" : ("nome" in linha) ? "nome" : "name";
              sb.from(tabela).select("destaque").eq(colNome, nome).limit(1).then(function (res) {
                cb.checked = !!(res.data && res.data[0] && res.data[0].destaque);
              });
            });
          });
        }, 300);
      });
      obs.observe(overlay, { attributes: true, attributeFilter: ["class", "style"] });
    }
  }

  function iniciar() { carregar(); prepararAdmin(); }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
