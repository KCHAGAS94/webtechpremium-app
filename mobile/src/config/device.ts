// Production painel (dashboard/ Next.js project), hosted on the VPS at this
// domain. Every device asks it "what playlist is assigned to my MAC?" — see
// panel-api.ts. Point this at a local IP (e.g. 'http://192.168.0.42:3000/api')
// only while developing against `npm run dev` in dashboard/.
export const PANEL_API_BASE_URL = 'https://painel.webtechpremium.kchagas.com.br/api';
