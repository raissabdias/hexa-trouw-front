# Travel Hexa+

Sistema moderno de gestão logística focado em roteirização inteligente e controle de entregas em tempo real. 

O Travel Hexa+ permite que operadores logísticos planejem viagens, gerenciem notas fiscais e visualizem rotas geográficas de forma intuitiva e eficiente através de uma interface premium e de alta performance.

---

## Funcionalidades Principais

*   **Dashboard de Viagens**: Mapa interativo integrado ao Google Maps para visualização de rotas e pontos de entrega.
*   **Roteirização Inteligente**: Criação de viagens a partir de notas fiscais selecionadas com cálculo automático de pontos de parada.
*   **Gestão de Notas Fiscais**: Listagem e filtragem de notas disponíveis para embarque (availableOnly).
*   **Mapa Avançado**: 
    - Suporte a múltiplos pins com cores de marca.
    - Detalhes (InfoWindow) acessíveis via clique com o botão direito.
    - Sincronização em tempo real entre tabela e mapa.
*   **Navegação via URL**: Acesso direto a módulos de Notas, Locais e Viagens através de rotas dedicadas (/travel, /invoices, /locations).
*   **Controle de Ciclo de Vida**: Ferramentas para criação e exclusão de viagens com retorno automático das notas ao estoque de disponíveis.

---

## Tecnologias Utilizadas

*   **Core**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **Build Tool**: [Vite 6](https://vitejs.dev/)
*   **Mapas**: [@react-google-maps/api](https://www.npmjs.com/package/@react-google-maps/api)
*   **Estilização**: [Tailwind CSS](https://tailwindcss.com/)
*   **Ícones**: [Lucide React](https://lucide.dev/)
*   **Roteamento**: [React Router Dom](https://reactrouter.com/)
*   **HTTP**: [Axios](https://axios-http.com/)

---

## Configuração do Ambiente

### Pré-requisitos
*   Node.js 20+
*   NPM ou Yarn
*   Chave de API do Google Maps (com Maps JavaScript API habilitada)

### Variáveis de Ambiente (.env)
Crie um arquivo .env na raiz do projeto com as seguintes variáveis:

```env
VITE_GOOGLE_MAPS_API_KEY=sua_chave_aqui
VITE_ORIGIN_ID=id_do_ponto_de_origem_padrao
```

---

## Como Executar

### 1. Instalação de Dependências
```bash
npm install
```

### 2. Rodar em Desenvolvimento
```bash
npm run dev
```
Acesse http://localhost:5173 no seu navegador.

### 3. Build para Produção
```bash
npm run build
```

---

## Docker Support

O projeto está pronto para rodar em containers:

```bash
# Subir com build
docker-compose up --build
```

---

## Estrutura do Projeto

*   src/components: Componentes reutilizáveis (Layouts, Cabeçalhos).
*   src/pages: Telas principais (Viagens, Notas Fiscais, Locais).
*   src/services: Configuração de API (Axios).
*   src/utils: Funções utilitárias (Decodificação de Polylines).

---

## Licença

Este projeto é desenvolvido para fins de gestão logística interna. Todos os direitos reservados.
