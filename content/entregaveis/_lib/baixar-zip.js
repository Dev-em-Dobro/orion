/*
  baixar-zip.js — download de kits do Arsenal como .zip (Consultoria Freela · Dev em Dobro)
  Sem build, sem backend: usa o JSZip vendorado (_lib/jszip.min.js) e monta o zip no navegador,
  pegando os arquivos ao vivo (o que voce baixa e sempre igual ao que aparece na previa).

  Como usar num botao:
    <button class="dl" type="button"
            data-zip-base="clinica-odonto/"                    <- prefixo do caminho (relativo a pagina)
            data-zip-files="index.html,PERSONALIZAR.md"        <- arquivos (o 1o e obrigatorio)
            data-zip-name="clinica-odonto.zip"                 <- nome do arquivo baixado
            data-zip-folder="clinica-odonto">                  <- pasta dentro do zip (opcional)
      <svg ...></svg><span class="dl-txt">Baixar .zip</span>
    </button>

  Requer que _lib/jszip.min.js seja carregado ANTES deste arquivo.
  Observacao: o download funciona dentro do Orion com sessao ativa.
*/
(function () {
  'use strict';

  function baixarBlob(blob, nome) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1500);
  }

  function pegarArquivo(caminho) {
    return fetch(caminho, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' em ' + caminho);
      return r.blob();
    });
  }

  function gerarZip(btn) {
    if (typeof JSZip === 'undefined') {
      alert('Não consegui carregar o compactador. Recarregue a página e tente de novo.');
      return;
    }

    var base = btn.getAttribute('data-zip-base') || '';
    var lista = (btn.getAttribute('data-zip-files') || '')
      .split(',')
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
    var nomeZip = btn.getAttribute('data-zip-name') || 'download.zip';
    var pasta = btn.getAttribute('data-zip-folder');
    if (pasta == null) pasta = nomeZip.replace(/\.zip$/i, '');
    if (!lista.length) return;

    var txtEl = btn.querySelector('.dl-txt');
    var rotuloOrig = txtEl ? txtEl.textContent : '';

    btn.disabled = true;
    btn.classList.remove('ok', 'err');
    if (txtEl) txtEl.textContent = 'Zipando…';

    var zip = new JSZip();
    var dir = pasta ? zip.folder(pasta) : zip;
    var baixados = 0;

    // baixa os arquivos em sequencia; o primeiro e obrigatorio, o resto e "melhor esforco"
    var cadeia = Promise.resolve();
    lista.forEach(function (nome, i) {
      cadeia = cadeia.then(function () {
        return pegarArquivo(base + nome).then(
          function (blob) { dir.file(nome, blob); baixados++; },
          function (err) { if (i === 0) throw err; /* opcionais podem faltar */ }
        );
      });
    });

    cadeia
      .then(function () {
        if (!baixados) throw new Error('nenhum arquivo baixado');
        return zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        });
      })
      .then(function (blob) {
        baixarBlob(blob, nomeZip);
        btn.classList.add('ok');
        if (txtEl) txtEl.textContent = 'Baixado ✓';
      })
      .catch(function (err) {
        console.error('[baixar-zip]', err);
        btn.classList.add('err');
        if (txtEl) txtEl.textContent = 'Tentar de novo';
        alert(
          'Não consegui montar o .zip aqui.\n\n' +
          'Atualize a página no Orion e tente de novo.'
        );
      })
      .then(function () {
        btn.disabled = false;
        setTimeout(function () {
          btn.classList.remove('ok', 'err');
          if (txtEl) txtEl.textContent = rotuloOrig || 'Baixar .zip';
        }, 2600);
      });
  }

  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest ? ev.target.closest('.dl') : null;
    if (!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    gerarZip(btn);
  });
})();
