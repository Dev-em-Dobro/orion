/**
 * Relay TCP que adiciona latência a cada ida-e-volta do Postgres.
 *
 * Por que existe: o `.env` de desenvolvimento aponta pra um Postgres em
 * `localhost` (Docker), onde uma query custa ~1 ms. Produção é Neon, onde a
 * mesma query custa a viagem de rede — algo entre 15 e 60 ms dependendo da
 * região. Medir a página contra o banco local e declarar "carrega em 30 ms" é
 * medir o ambiente errado: quem tem 8 consultas em sequência ganha 8 × a
 * latência no ambiente hospedado, e a conta muda de ordem de grandeza.
 *
 * O relay não simula banda nem CPU do banco — só o tempo de viagem, que é
 * exatamente o que muda de local pra hospedado. É uma aproximação por baixo:
 * o número real de produção tende a ser pior, nunca melhor.
 *
 *   npx tsx scripts/perf-proxy-latencia.mts 5433 5432 35
 */

import net from "node:net";

const portaEscuta = Number(process.argv[2] ?? 5433);
const portaDestino = Number(process.argv[3] ?? 5432);
const atrasoMs = Number(process.argv[4] ?? 35);

export function criarProxy(escuta: number, destino: number, atraso: number) {
  const servidor = net.createServer((cliente) => {
    const upstream = net.connect(destino, "127.0.0.1");
    const encaminhar = (de: net.Socket, para: net.Socket) => {
      de.on("data", (chunk) => {
        // Metade do atraso em cada sentido: o par pergunta/resposta soma o
        // RTT inteiro, que é o que a aplicação sente.
        setTimeout(() => {
          if (!para.destroyed) para.write(chunk);
        }, atraso / 2);
      });
      de.on("close", () => setTimeout(() => para.end(), atraso));
      de.on("error", () => para.destroy());
    };
    encaminhar(cliente, upstream);
    encaminhar(upstream, cliente);
  });
  servidor.listen(escuta, "127.0.0.1");
  return servidor;
}

// Só sobe sozinho quando chamado direto, não quando importado pelo medidor.
if (process.argv[1]?.includes("perf-proxy-latencia")) {
  criarProxy(portaEscuta, portaDestino, atrasoMs);
  console.log(
    `proxy 127.0.0.1:${portaEscuta} → 127.0.0.1:${portaDestino} (+${atrasoMs} ms por ida-e-volta)`,
  );
}
