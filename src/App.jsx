import { useState, useEffect, useRef } from "react";
import { IMGS, CATEGORIES, PARTNERS, SAUCES, VIANDES_TACOS, MENU, EXTRAS } from "./data/partners.js";
import { CONFIG } from "./data/config.js";

// ─── HOOKS ───────────────────────────────────────────────────────────────────
function useInView(ref) {
  const [v, setV] = useState(false);
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold: 0.1 });
    if (ref.current) o.observe(ref.current);
    return () => o.disconnect();
  }, []);
  return v;
}

function FadeUp({ children, delay = 0, style = {} }) {
  const ref = useRef();
  const v = useInView(ref);
  return (
    <div ref={ref} style={{ opacity: v?1:0, transform: v?"none":"translateY(22px)", transition:`opacity .65s ease ${delay}s, transform .65s ease ${delay}s`, ...style }}>
      {children}
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
::selection{background:rgba(107,29,29,.14);}
::-webkit-scrollbar{width:3px;}
::-webkit-scrollbar-thumb{background:rgba(107,29,29,.3);border-radius:2px;}
html{scroll-behavior:smooth;}
.fd{font-family:'Cormorant Garamond',serif;}
.fb{font-family:'DM Sans',sans-serif;}

.nav{position:fixed;top:0;left:0;right:0;z-index:200;height:66px;display:flex;align-items:center;justify-content:space-between;padding:0 48px;background:rgba(247,243,238,.9);backdrop-filter:blur(16px);border-bottom:1px solid rgba(107,29,29,.08);}
.logo{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:#1C1208;letter-spacing:.02em;cursor:pointer;}
.logo em{font-style:italic;color:#6B1D1D;}
.nav-links{display:flex;gap:32px;list-style:none;}
.nav-links a{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:400;letter-spacing:.1em;text-transform:uppercase;color:#7A6555;text-decoration:none;cursor:pointer;transition:color .2s;}
.nav-links a:hover{color:#6B1D1D;}
.nav-cta{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;background:#6B1D1D;color:#F7F3EE;padding:10px 22px;border-radius:3px;border:none;cursor:pointer;letter-spacing:.03em;transition:background .2s,box-shadow .2s;}
.nav-cta:hover{background:#4A1212;}

.hero{min-height:100vh;padding:140px 48px 0;display:flex;flex-direction:column;justify-content:center;}
.hero-badge{display:inline-flex;align-items:center;gap:10px;margin-bottom:36px;}
.badge-dot{width:7px;height:7px;border-radius:50%;background:#6B1D1D;animation:ripple 2.5s ease-in-out infinite;}
@keyframes ripple{0%{box-shadow:0 0 0 0 rgba(107,29,29,.45);}70%{box-shadow:0 0 0 8px rgba(107,29,29,0);}100%{box-shadow:0 0 0 0 rgba(107,29,29,0);}}
.badge-txt{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:400;letter-spacing:.18em;text-transform:uppercase;color:#7A6555;}
.hero-title{font-family:'Cormorant Garamond',serif;font-size:clamp(56px,8.5vw,108px);font-weight:600;line-height:.95;letter-spacing:-.01em;color:#1C1208;margin-bottom:36px;}
.hero-title em{font-style:italic;color:#6B1D1D;position:relative;}
.hero-title em::after{content:'';position:absolute;left:0;bottom:4px;width:100%;height:2px;background:linear-gradient(90deg,#6B1D1D,rgba(107,29,29,.2));transform:scaleX(0);transform-origin:left;animation:drawLine 1s ease .9s forwards;}
@keyframes drawLine{to{transform:scaleX(1);}}
.hero-foot{display:flex;align-items:flex-end;justify-content:space-between;gap:40px;flex-wrap:wrap;padding-bottom:80px;}
.hero-desc{font-family:'DM Sans',sans-serif;font-size:16px;font-weight:300;color:#7A6555;line-height:1.8;max-width:400px;}
.btn-primary{display:inline-flex;align-items:center;gap:10px;background:#6B1D1D;color:#F7F3EE;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;padding:16px 32px;border-radius:3px;border:none;cursor:pointer;letter-spacing:.04em;transition:background .25s,transform .2s,box-shadow .25s;}
.btn-primary:hover{background:#4A1212;transform:translateY(-2px);box-shadow:0 10px 28px rgba(107,29,29,.22);}
.btn-primary .arr{display:inline-block;transition:transform .2s;}
.btn-primary:hover .arr{transform:translateX(4px);}
.hero-note{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:300;color:rgba(122,101,85,.45);letter-spacing:.05em;}

.ticker-wrap{overflow:hidden;padding:15px 0;border-top:1px solid rgba(107,29,29,.08);border-bottom:1px solid rgba(107,29,29,.08);background:rgba(107,29,29,.025);}
.ticker{display:flex;width:max-content;animation:scroll 20s linear infinite;}
.ticker:hover{animation-play-state:paused;}
.ticker-item{font-family:'Cormorant Garamond',serif;font-size:14px;font-style:italic;color:rgba(107,29,29,.45);padding:0 30px;white-space:nowrap;display:flex;align-items:center;gap:30px;}
.ticker-item::after{content:'·';opacity:.35;}
@keyframes scroll{from{transform:translateX(0);}to{transform:translateX(-50%);}}

.section{padding:100px 48px;}
.sec-tag{font-family:'DM Sans',sans-serif;font-size:10px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:#6B1D1D;margin-bottom:16px;display:flex;align-items:center;gap:10px;}
.sec-tag::before{content:'';width:28px;height:1px;background:#6B1D1D;display:block;}
.sec-title{font-family:'Cormorant Garamond',serif;font-size:clamp(36px,5vw,58px);font-weight:600;line-height:1.1;color:#1C1208;margin-bottom:60px;}
.sec-title em{font-style:italic;color:#6B1D1D;}
.div-label{display:flex;align-items:center;gap:24px;padding:0 48px;}
.div-line{flex:1;height:1px;background:rgba(107,29,29,.1);}
.div-txt{font-family:'Cormorant Garamond',serif;font-size:12px;font-style:italic;color:rgba(107,29,29,.3);letter-spacing:.06em;white-space:nowrap;}

.how-grid{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid rgba(107,29,29,.1);border-radius:6px;overflow:hidden;}
.how-card{padding:48px 36px;border-right:1px solid rgba(107,29,29,.1);background:#FDFAF6;position:relative;overflow:hidden;transition:background .3s;}
.how-card:last-child{border-right:none;}
.how-card:hover{background:#FBF5EE;}
.how-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:#6B1D1D;transform:scaleX(0);transform-origin:left;transition:transform .4s ease;}
.how-card:hover::before{transform:scaleX(1);}
.how-num{font-family:'Cormorant Garamond',serif;font-size:68px;font-weight:600;color:rgba(107,29,29,.07);line-height:1;margin-bottom:18px;}
.how-title{font-family:'Cormorant Garamond',serif;font-size:25px;font-weight:600;color:#1C1208;margin-bottom:10px;}
.how-desc{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:#7A6555;line-height:1.75;}

/* ── CATEGORY CARDS ── */
.cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;}
.catcard{background:#FDFAF6;border:1px solid rgba(107,29,29,.1);border-radius:6px;padding:36px 32px;cursor:pointer;transition:all .25s;position:relative;overflow:hidden;}
.catcard.active:hover{transform:translateY(-4px);box-shadow:0 20px 48px rgba(28,18,8,.09);border-color:rgba(107,29,29,.25);}
.catcard.inactive{opacity:.5;cursor:default;}
.catcard::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:#6B1D1D;transform:scaleX(0);transform-origin:left;transition:transform .4s ease;}
.catcard.active:hover::before{transform:scaleX(1);}
.catcard-icon{font-size:36px;margin-bottom:20px;display:block;}
.catcard-name{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:600;color:#1C1208;margin-bottom:8px;}
.catcard-desc{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:#7A6555;line-height:1.6;margin-bottom:20px;}
.catcard-foot{display:flex;justify-content:space-between;align-items:center;padding-top:16px;border-top:1px solid rgba(107,29,29,.08);}
.catcard-cta{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;color:#6B1D1D;letter-spacing:.04em;}
.catcard-soon{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:400;color:rgba(122,101,85,.5);letter-spacing:.08em;text-transform:uppercase;}
.catcard-arrow{width:30px;height:30px;border-radius:50%;border:1px solid rgba(107,29,29,.2);display:flex;align-items:center;justify-content:center;font-size:14px;color:#6B1D1D;transition:all .3s;}
.catcard.active:hover .catcard-arrow{background:#6B1D1D;color:#F7F3EE;transform:rotate(45deg);}

/* ── CATEGORY PAGE ── */
.catpage-hero{background:#1C1208;padding:120px 48px 60px;}
.catpage-back{display:inline-flex;align-items:center;gap:8px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:400;letter-spacing:.1em;text-transform:uppercase;color:rgba(247,243,238,.5);margin-bottom:28px;cursor:pointer;border:none;background:none;padding:0;transition:color .2s;}
.catpage-back:hover{color:#F7F3EE;}
.catpage-icon{font-size:44px;margin-bottom:16px;display:block;}
.catpage-title{font-family:'Cormorant Garamond',serif;font-size:clamp(44px,6vw,72px);font-weight:700;color:#F7F3EE;line-height:.95;margin-bottom:12px;}
.catpage-title em{font-style:italic;color:rgba(247,243,238,.5);}
.catpage-sub{font-family:'DM Sans',sans-serif;font-size:14px;font-weight:300;color:rgba(247,243,238,.5);letter-spacing:.04em;}

/* ── PARTNER CARDS ── */
.partners-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;}
.pcard{background:#FDFAF6;border:1px solid rgba(107,29,29,.1);border-radius:6px;overflow:hidden;cursor:pointer;transition:transform .3s ease,box-shadow .3s ease,border-color .3s;}
.pcard:hover{transform:translateY(-4px);box-shadow:0 20px 48px rgba(28,18,8,.09);border-color:rgba(107,29,29,.22);}
.pcard-img{height:200px;position:relative;overflow:hidden;background:#1C1208;}
.pcard-img img{width:100%;height:100%;object-fit:cover;transition:transform .5s ease;}
.pcard:hover .pcard-img img{transform:scale(1.04);}
.pcard-img::after{content:'';position:absolute;inset:0;background:linear-gradient(to bottom,transparent 40%,rgba(28,18,8,.4));}
.pcard-status{position:absolute;top:14px;right:14px;z-index:2;background:rgba(247,243,238,.92);backdrop-filter:blur(8px);border-radius:100px;padding:4px 12px;font-family:'DM Sans',sans-serif;font-size:11px;color:#2D6A4F;display:flex;align-items:center;gap:6px;}
.sdot{width:5px;height:5px;border-radius:50%;background:#2D6A4F;animation:ripple 2.2s infinite;}
.pcard-body{padding:24px 26px 26px;}
.pcard-cat{font-family:'DM Sans',sans-serif;font-size:10px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:#6B1D1D;margin-bottom:7px;}
.pcard-name{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:600;color:#1C1208;margin-bottom:8px;line-height:1;}
.pcard-desc{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:#7A6555;line-height:1.65;margin-bottom:20px;}
.pcard-foot{display:flex;justify-content:space-between;align-items:center;padding-top:16px;border-top:1px solid rgba(107,29,29,.08);}
.pcard-cta{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;color:#6B1D1D;letter-spacing:.04em;}
.pcard-icon{width:30px;height:30px;border-radius:50%;border:1px solid rgba(107,29,29,.2);display:flex;align-items:center;justify-content:center;font-size:14px;color:#6B1D1D;transition:all .3s;}
.pcard:hover .pcard-icon{background:#6B1D1D;color:#F7F3EE;transform:rotate(45deg);}

/* ── SNACK PAGE ── */
.snack-hero{min-height:60vh;position:relative;overflow:hidden;display:flex;align-items:flex-end;padding:80px 48px 60px;}
.snack-hero-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.snack-hero-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(28,18,8,.3) 0%,rgba(28,18,8,.75) 100%);}
.snack-hero-content{position:relative;z-index:1;color:#F7F3EE;}
.snack-back{display:inline-flex;align-items:center;gap:8px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:400;letter-spacing:.1em;text-transform:uppercase;color:rgba(247,243,238,.6);margin-bottom:24px;cursor:pointer;transition:color .2s;border:none;background:none;padding:0;}
.snack-back:hover{color:#F7F3EE;}
.snack-name{font-family:'Cormorant Garamond',serif;font-size:clamp(48px,7vw,80px);font-weight:700;line-height:.95;margin-bottom:16px;}
.snack-meta{display:flex;gap:24px;flex-wrap:wrap;}
.snack-meta-item{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:rgba(247,243,238,.65);}
.hours-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1px;background:rgba(107,29,29,.1);border:1px solid rgba(107,29,29,.1);border-radius:6px;overflow:hidden;margin-bottom:64px;}
.hours-card{background:#FDFAF6;padding:28px 24px;}
.hours-day{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:#1C1208;margin-bottom:8px;}
.hours-slot{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:#7A6555;margin-bottom:3px;}
.tabs{display:flex;gap:4px;margin-bottom:40px;background:rgba(107,29,29,.04);padding:4px;border-radius:5px;width:fit-content;}
.tab{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:400;padding:10px 20px;border-radius:3px;border:none;cursor:pointer;background:transparent;color:#7A6555;transition:all .2s;}
.tab.active{background:#6B1D1D;color:#F7F3EE;}
.menu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-bottom:48px;}
.mitem{background:#FDFAF6;border:1px solid rgba(107,29,29,.1);border-radius:6px;overflow:hidden;cursor:pointer;transition:all .25s;}
.mitem:hover{border-color:rgba(107,29,29,.25);box-shadow:0 8px 24px rgba(28,18,8,.07);}
.mitem.selected{border-color:#6B1D1D;box-shadow:0 0 0 2px rgba(107,29,29,.12);}
.mitem-img{height:180px;overflow:hidden;background:#1C1208;}
.mitem-img img{width:100%;height:100%;object-fit:cover;transition:transform .4s;}
.mitem:hover .mitem-img img{transform:scale(1.05);}
.mitem-body{padding:18px 20px;}
.mitem-name{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#1C1208;margin-bottom:5px;}
.mitem-desc{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:300;color:#9A8878;line-height:1.6;margin-bottom:14px;}
.mitem-foot{display:flex;justify-content:space-between;align-items:center;}
.mitem-price{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;color:#6B1D1D;}
.mitem-select{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;color:#6B1D1D;border:1px solid rgba(107,29,29,.25);border-radius:100px;padding:5px 14px;transition:all .2s;}
.mitem.selected .mitem-select{background:#6B1D1D;color:#F7F3EE;border-color:#6B1D1D;}
.order-panel{background:#FDFAF6;border:1px solid rgba(107,29,29,.1);border-radius:8px;padding:40px;margin-top:40px;}
.op-title{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:600;color:#1C1208;margin-bottom:28px;}
.op-section{margin-bottom:28px;}
.op-label{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:#6B1D1D;margin-bottom:12px;display:flex;align-items:center;gap:8px;}
.op-label::before{content:'';width:20px;height:1px;background:#6B1D1D;}
.input{width:100%;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:300;color:#1C1208;background:white;border:1px solid rgba(107,29,29,.15);border-radius:4px;padding:13px 16px;outline:none;transition:border-color .2s;}
.input:focus{border-color:#6B1D1D;}
.sauces-grid{display:flex;flex-wrap:wrap;gap:8px;}
.sauce-btn{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:300;color:#7A6555;border:1px solid rgba(107,29,29,.15);border-radius:100px;padding:5px 14px;cursor:pointer;transition:all .2s;background:white;}
.sauce-btn.sel{background:#6B1D1D;color:#F7F3EE;border-color:#6B1D1D;}
.viande-btn{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:300;color:#7A6555;border:1px solid rgba(107,29,29,.15);border-radius:4px;padding:8px 16px;cursor:pointer;transition:all .2s;background:white;}
.viande-btn.sel{background:#6B1D1D;color:#F7F3EE;border-color:#6B1D1D;}
.extras-grid{display:flex;flex-wrap:wrap;gap:8px;}
.extra-btn{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:300;color:#7A6555;border:1px solid rgba(107,29,29,.15);border-radius:4px;padding:8px 16px;cursor:pointer;transition:all .2s;background:white;display:flex;align-items:center;gap:6px;}
.extra-btn.sel{background:#6B1D1D;color:#F7F3EE;border-color:#6B1D1D;}
.time-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;}
.time-btn{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:400;color:#7A6555;border:1px solid rgba(107,29,29,.15);border-radius:4px;padding:10px;text-align:center;cursor:pointer;transition:all .2s;background:white;}
.time-btn.sel{background:#6B1D1D;color:#F7F3EE;border-color:#6B1D1D;}
.order-summary{background:white;border:1px solid rgba(107,29,29,.1);border-radius:6px;padding:24px;margin-bottom:28px;}
.summary-row{display:flex;justify-content:space-between;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:#7A6555;margin-bottom:8px;}
.summary-total{display:flex;justify-content:space-between;font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#1C1208;padding-top:12px;border-top:1px solid rgba(107,29,29,.08);margin-top:4px;}
.btn-call{width:100%;display:flex;align-items:center;justify-content:center;gap:12px;background:#6B1D1D;color:#F7F3EE;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:500;padding:18px;border-radius:4px;border:none;cursor:pointer;transition:background .25s,transform .2s,box-shadow .25s;}
.btn-call:hover{background:#4A1212;transform:translateY(-2px);box-shadow:0 12px 32px rgba(107,29,29,.25);}
.btn-call:disabled{background:rgba(107,29,29,.25);cursor:not-allowed;transform:none;box-shadow:none;}
.call-note{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:300;color:rgba(122,101,85,.45);text-align:center;margin-top:12px;letter-spacing:.04em;}
.success{text-align:center;padding:60px 40px;}
.success-icon{font-size:48px;margin-bottom:20px;}
.success-title{font-family:'Cormorant Garamond',serif;font-size:40px;font-weight:600;color:#1C1208;margin-bottom:12px;}
.success-desc{font-family:'DM Sans',sans-serif;font-size:14px;font-weight:300;color:#7A6555;line-height:1.7;}
.footer{border-top:1px solid rgba(107,29,29,.08);padding:44px 48px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;}
.footer-logo{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:700;color:#1C1208;}
.footer-logo em{font-style:italic;color:#6B1D1D;}
.footer-copy{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:300;color:rgba(122,101,85,.4);letter-spacing:.06em;}
@media(max-width:768px){
.nav{padding:0 20px;}.nav-links{display:none;}
.hero{padding-left:20px;padding-right:20px;}
.how-grid{grid-template-columns:1fr;}
.section{padding:70px 20px;}
.catpage-hero{padding:100px 20px 48px;}
.snack-hero{padding:100px 20px 40px;}
.div-label{padding:0 20px;}
.footer{padding:36px 20px;}
.order-panel{padding:24px 20px;}
.tabs{flex-wrap:wrap;}
}
`;

// ─── TIME SLOTS ───────────────────────────────────────────────────────────────
function getSlots() {
  const { midi, soir } = CONFIG.horaires_slots;
  const s = [];
  for (let h=midi.debut;h<midi.fin;h++){s.push(`${h}h00`);s.push(`${h}h30`);}
  for (let h=soir.debut;h<soir.fin;h++){s.push(`${h}h00`);s.push(`${h}h30`);}
  return s;
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
function HomePage({ onNavigate }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setTimeout(() => setLoaded(true), 80); }, []);
  const TICKER = ["Bordeaux","Partenaires locaux","Prix négociés","Retrait rapide","100% local"];

  return (
    <>
      <section className="hero" style={{ background:"#F7F3EE" }}>
        <div className="hero-badge" style={{ opacity:loaded?1:0, transition:"opacity .8s ease .1s" }}>
          <div className="badge-dot"/>
          <span className="badge-txt fb">Bordeaux · Partenaires locaux</span>
        </div>
        <div style={{ opacity:loaded?1:0, transform:loaded?"none":"translateY(20px)", transition:"opacity .9s ease .25s,transform .9s ease .25s" }}>
          <h1 className="hero-title fd">Le meilleur<br/>de <em>Bordeaux</em>,<br/>à portée de main.</h1>
        </div>
        <div className="hero-foot" style={{ opacity:loaded?1:0, transition:"opacity .9s ease .5s" }}>
          <p className="hero-desc fb">Accédez aux meilleures adresses de Bordeaux à des prix négociés. Commandez en 2 minutes, récupérez sans attendre.</p>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:14 }}>
            <button className="btn-primary fb" onClick={() => document.getElementById("categories")?.scrollIntoView({ behavior:"smooth" })}>
              Explorer <span className="arr">→</span>
            </button>
            <span className="hero-note fb">Gratuit · Sans inscription</span>
          </div>
        </div>
      </section>

      <div className="ticker-wrap">
        <div className="ticker">
          {[...TICKER,...TICKER,...TICKER,...TICKER].map((t,i)=>(
            <div className="ticker-item fd" key={i}>{t}</div>
          ))}
        </div>
      </div>

      <section className="section" style={{ background:"#F7F3EE" }}>
        <FadeUp>
          <div className="sec-tag fb">Simple &amp; rapide</div>
          <div className="sec-title fd">Commander en <em>3 étapes</em></div>
        </FadeUp>
        <FadeUp delay={.1}>
          <div className="how-grid">
            {[["01","Choisissez","Parcourez nos catégories et trouvez le partenaire qui vous convient."],
              ["02","Commandez","Sélectionnez votre formule, votre heure de retrait et validez."],
              ["03","Profitez","Votre commande est prête. Récupérez-la sans file d'attente."]
            ].map(([n,t,d])=>(
              <div className="how-card" key={n}>
                <div className="how-num fd">{n}</div>
                <div className="how-title fd">{t}</div>
                <div className="how-desc fb">{d}</div>
              </div>
            ))}
          </div>
        </FadeUp>
      </section>

      <div className="div-label"><div className="div-line"/><span className="div-txt fd">Nos catégories</span><div className="div-line"/></div>

      <section className="section" id="categories" style={{ background:"#F7F3EE" }}>
        <FadeUp>
          <div className="sec-tag fb">À Bordeaux</div>
          <div className="sec-title fd">Que cherchez-<em>vous</em> ?</div>
        </FadeUp>
        <FadeUp delay={.1}>
          <div className="cat-grid">
            {CATEGORIES.map(cat => (
              <div
                key={cat.id}
                className={`catcard ${cat.active?"active":"inactive"}`}
                onClick={() => cat.active && onNavigate("category", cat.id)}
              >
                <span className="catcard-icon">{cat.icon}</span>
                <div className="catcard-name fd">{cat.label}</div>
                <div className="catcard-desc fb">{cat.desc}</div>
                <div className="catcard-foot">
                  {cat.active
                    ? <><span className="catcard-cta fb">Voir les adresses</span><div className="catcard-arrow">→</div></>
                    : <span className="catcard-soon fb">Bientôt disponible</span>
                  }
                </div>
              </div>
            ))}
          </div>
        </FadeUp>
      </section>

      <footer className="footer" style={{ background:"#F7F3EE" }}>
        <div className="footer-logo fd">local<em>ly</em></div>
        <div className="footer-copy fb">© 2025 · Bordeaux · Tous droits réservés</div>
      </footer>
    </>
  );
}

// ─── CATEGORY PAGE ────────────────────────────────────────────────────────────
function CategoryPage({ categoryId, onBack, onNavigate }) {
  const cat = CATEGORIES.find(c => c.id === categoryId);
  const partners = PARTNERS.filter(p => p.category === categoryId && p.active);

  return (
    <>
      <div className="catpage-hero">
        <button className="catpage-back fb" onClick={onBack}>← Retour</button>
        <span className="catpage-icon">{cat.icon}</span>
        <div className="catpage-title fd">{cat.label}<br/><em>à Bordeaux</em></div>
        <div className="catpage-sub fb">{partners.length} adresse{partners.length > 1 ? "s" : ""} disponible{partners.length > 1 ? "s" : ""}</div>
      </div>

      <div style={{ background:"#F7F3EE", padding:"64px 48px" }}>
        <FadeUp>
          <div className="partners-grid">
            {partners.map(p => (
              <div key={p.id} className="pcard" onClick={() => onNavigate(p.id)}>
                <div className="pcard-img">
                  <img src={p.img} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  <div className="pcard-status"><div className="sdot"/><span className="fb">Disponible</span></div>
                </div>
                <div className="pcard-body">
                  <div className="pcard-cat fb">{cat.label}</div>
                  <div className="pcard-name fd">{p.name}</div>
                  <div className="pcard-desc fb">{p.desc} {p.address}</div>
                  <div className="pcard-foot">
                    <span className="pcard-cta fb">Commander maintenant</span>
                    <div className="pcard-icon">→</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </FadeUp>
      </div>

      <footer className="footer" style={{ background:"#F7F3EE" }}>
        <div className="footer-logo fd">local<em>ly</em></div>
        <div className="footer-copy fb">© 2025 · Bordeaux · Tous droits réservés</div>
      </footer>
    </>
  );
}

// ─── SNACK PAGE ───────────────────────────────────────────────────────────────
function SnackPage({ onBack }) {
  const [activeTab, setActiveTab] = useState("kebab");
  const [selected, setSelected] = useState(null);
  const [sauce, setSauce] = useState([]);
  const [viande, setViande] = useState(null);
  const [extras, setExtras] = useState([]);
  const [time, setTime] = useState(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [ordered, setOrdered] = useState(false);

  const partner = PARTNERS.find(p => p.id === "snack");
  const slots = getSlots();
  const currentCat = MENU.find(c => c.id === activeTab);
  const toggleSauce = (s) => setSauce(prev => prev.includes(s) ? prev.filter(x=>x!==s) : [...prev,s]);
  const toggleExtra = (e) => setExtras(prev => prev.includes(e) ? prev.filter(x=>x!==e) : [...prev,e]);
  const total = selected ? selected.price + extras.reduce((sum,eid)=>{ const ex=EXTRAS.find(e=>e.id===eid); return sum+(ex?ex.price:0); },0) : 0;
  const canOrder = selected && time && name.trim().length > 1;

  function handleOrder() {
    if (!canOrder) return;
    window.location.href = `tel:${partner.phone}`;
    setOrdered(true);
  }

  return (
    <>
      <div className="snack-hero" style={{ paddingTop:100 }}>
        <img className="snack-hero-bg" src={partner.img} alt={partner.name}/>
        <div className="snack-hero-overlay"/>
        <div className="snack-hero-content">
          <button className="snack-back fb" onClick={onBack}>← Retour</button>
          <div className="snack-name fd">{partner.name}</div>
          <div className="snack-meta">
            <div className="snack-meta-item fb">📍 {partner.address}</div>
            <div className="snack-meta-item fb">📞 {partner.phone.replace(/(\d{2})(?=\d)/g,"$1 ").trim()}</div>
          </div>
        </div>
      </div>

      <div style={{ background:"#F7F3EE", padding:"72px 48px" }}>
        <FadeUp>
          <div className="sec-tag fb">Horaires</div>
          <div className="sec-title fd" style={{ marginBottom:32 }}>Quand <em>passer</em> ?</div>
          <div className="hours-grid">
            {partner.hours.map(h=>(
              <div className="hours-card" key={h.day}>
                <div className="hours-day fd">{h.day}</div>
                {h.slots.map(s=><div className="hours-slot fb" key={s}>{s}</div>)}
              </div>
            ))}
          </div>
        </FadeUp>

        <FadeUp>
          <div className="sec-tag fb">Menu</div>
          <div className="sec-title fd">Choisissez votre <em>plat</em></div>
          <div className="tabs">
            {MENU.map(c=>(
              <button key={c.id} className={`tab fb ${activeTab===c.id?"active":""}`}
                onClick={()=>{setActiveTab(c.id);setSelected(null);setSauce([]);setViande(null);}}>
                {c.cat}
              </button>
            ))}
          </div>
          <div className="menu-grid">
            {currentCat?.items.map(item=>(
              <div key={item.id} className={`mitem ${selected?.id===item.id?"selected":""}`}
                onClick={()=>{setSelected(item);setSauce([]);setViande(null);}}>
                <div className="mitem-img">
                  <img src={item.img} alt={item.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                </div>
                <div className="mitem-body">
                  <div className="mitem-name fd">{item.name}</div>
                  <div className="mitem-desc fb">{item.desc}</div>
                  <div className="mitem-foot">
                    <span className="mitem-price fd">{item.price}€</span>
                    <span className="mitem-select fb">{selected?.id===item.id?"✓ Sélectionné":"Choisir"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </FadeUp>

        {selected && (
          <FadeUp>
            {ordered ? (
              <div className="order-panel success">
                <div className="success-icon">📞</div>
                <div className="success-title fd">Appelez pour confirmer</div>
                <div className="success-desc fb">
                  Votre commande est prête. Appelez le <strong>{partner.phone.replace(/(\d{2})(?=\d)/g,"$1 ")}</strong> pour la valider.<br/>
                  Retrait prévu : <strong>{time}</strong>
                </div>
                <button className="btn-primary fb" style={{ margin:"24px auto 0", display:"inline-flex" }}
                  onClick={()=>{setOrdered(false);setSelected(null);setTime(null);setName("");}}>
                  Nouvelle commande
                </button>
              </div>
            ) : (
              <div className="order-panel">
                <div className="op-title fd">Votre commande — <em>{selected.name}</em></div>

                {selected.hasViande && (
                  <div className="op-section">
                    <div className="op-label fb">Viande</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                      {VIANDES_TACOS.map(v=>(
                        <button key={v} className={`viande-btn fb ${viande===v?"sel":""}`} onClick={()=>setViande(v)}>{v}</button>
                      ))}
                    </div>
                  </div>
                )}

                {selected.hasSauce && (
                  <div className="op-section">
                    <div className="op-label fb">Sauce(s)</div>
                    <div className="sauces-grid">
                      {SAUCES.map(s=>(
                        <button key={s} className={`sauce-btn fb ${sauce.includes(s)?"sel":""}`} onClick={()=>toggleSauce(s)}>{s}</button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="op-section">
                  <div className="op-label fb">Extras</div>
                  <div className="extras-grid">
                    {EXTRAS.map(e=>(
                      <button key={e.id} className={`extra-btn fb ${extras.includes(e.id)?"sel":""}`} onClick={()=>toggleExtra(e.id)}>
                        {e.name} <span style={{ opacity:.6 }}>+{e.price}€</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="op-section">
                  <div className="op-label fb">Heure de retrait</div>
                  <div className="time-grid">
                    {slots.map(s=>(
                      <button key={s} className={`time-btn fb ${time===s?"sel":""}`} onClick={()=>setTime(s)}>{s}</button>
                    ))}
                  </div>
                </div>

                <div className="op-section">
                  <div className="op-label fb">Votre prénom</div>
                  <input className="input fb" placeholder="Ex : Thomas" value={name} onChange={e=>setName(e.target.value)}/>
                </div>

                <div className="op-section">
                  <div className="op-label fb">Note (optionnel)</div>
                  <input className="input fb" placeholder="Ex : sans oignons..." value={note} onChange={e=>setNote(e.target.value)}/>
                </div>

                <div className="order-summary">
                  <div className="summary-row"><span className="fb">{selected.name}</span><span className="fb">{selected.price}€</span></div>
                  {extras.map(eid=>{ const ex=EXTRAS.find(e=>e.id===eid); return ex?<div className="summary-row" key={eid}><span className="fb">{ex.name}</span><span className="fb">+{ex.price}€</span></div>:null; })}
                  <div className="summary-total"><span className="fd">Total</span><span className="fd">{total.toFixed(2)}€</span></div>
                </div>

                <button className="btn-call fb" disabled={!canOrder} onClick={handleOrder}>
                  📞 Commander par téléphone
                </button>
                <div className="call-note fb">
                  {canOrder ? "Un appel sera lancé pour confirmer votre commande" : "Complétez votre commande pour continuer"}
                </div>
              </div>
            )}
          </FadeUp>
        )}
      </div>

      <footer className="footer" style={{ background:"#F7F3EE" }}>
        <div className="footer-logo fd">local<em>ly</em></div>
        <div className="footer-copy fb">© 2025 · Bordeaux · Tous droits réservés</div>
      </footer>
    </>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const [activeCat, setActiveCat] = useState(null);

  useEffect(() => { window.scrollTo(0,0); }, [page]);

  function navigate(target, catId = null) {
    if (catId) setActiveCat(catId);
    setPage(target);
  }

  return (
    <div style={{ background:"#F7F3EE", minHeight:"100vh" }}>
      <style>{CSS}</style>

      <nav className="nav">
        <div className="logo fd" onClick={() => setPage("home")} style={{ cursor:"pointer" }}>local<em>ly</em></div>
        <ul className="nav-links">
          <li><a onClick={() => setPage("home")}>Accueil</a></li>
          {page === "category" && <li><a onClick={() => setPage("home")}>Catégories</a></li>}
          {page === "snack" && <li><a onClick={() => setPage("category")}>Restauration</a></li>}
        </ul>
        <button className="nav-cta fb" onClick={() => setPage("home")}>
          {page === "home" ? "Explorer →" : "Accueil"}
        </button>
      </nav>

      {page === "home"     && <HomePage     onNavigate={navigate} />}
      {page === "category" && <CategoryPage categoryId={activeCat} onBack={() => setPage("home")} onNavigate={(p) => setPage(p)} />}
      {page === "snack"    && <SnackPage    onBack={() => setPage("category")} />}
    </div>
  );
}
