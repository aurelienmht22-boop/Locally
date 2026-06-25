import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "./lib/supabase";
import { Html5Qrcode } from "html5-qrcode";
import html2canvas from "html2canvas";


const BOURSE_IMG = "/bordeaux.jpg";

function isOpen() {
  const now = new Date();
  const day = now.getDay();
  const t = now.getHours() * 60 + now.getMinutes();
  const s = (a,b) => t >= a*60 && t < b*60;
  if (day>=1&&day<=4) return s(11,14)||s(18,22);
  if (day===5) return s(11,14)||s(18,24);
  if (day===6||day===0) return s(18,24);
  return false;
}

const CATEGORIES = [
  { id:"restauration", label:"Restauration", icon:"🍽", desc:"Restaurants, snacks et saveurs locales" },
  { id:"boulangerie",  label:"Boulangerie",  icon:"🥐", desc:"Pains artisanaux, viennoiseries et pâtisseries" },
  { id:"sport",        label:"Sport",        icon:"⚡", desc:"Salles, cours et activités sportives" },
  { id:"bienetre",     label:"Bien-être",    icon:"🌿", desc:"Spa, massage, soins et relaxation" },
  { id:"activite",     label:"Activité",     icon:"🎯", desc:"Sorties, visites et loisirs à Bordeaux" },
  { id:"autre",        label:"Autre",        icon:"🏪", desc:"Commerces et services de proximité" },
];

const CATEGORIE_MAP={'Restauration':'restauration','Boulangerie':'boulangerie','Sport':'sport','Bien-être':'bienetre','Activité':'activite'};
const TAGS_PAR_CATEGORIE={
  'Restauration':['Sur place','À emporter','Livraison','Végétarien','Halal','Brunch','Snack','Gastronomique'],
  'Boulangerie':['Viennoiseries','Pain artisanal','Pâtisserie','Sans gluten','Bio'],
  'Bien-être':['Massage','Yoga','Méditation','Coiffure','Barbier','Esthétique','Spa','Naturopathie','Ostéopathie'],
  'Sport':['Salle de sport','Coach privé','Natation','Arts martiaux','Pilates','Crossfit'],
  'Activité':['Nautique','Vélo','Randonnée','Visite guidée','Urbain','Plein air','Culturel','Aventure','Détente','En famille'],
  'Autre':[],
};
const DAYS=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const TAG_ICONS={'Sur place':'🍽️','À emporter':'📦','Livraison':'🛵','Végétarien':'🥗','Halal':'🌙','Brunch':'☕','Snack':'🥪','Gastronomique':'⭐','Viennoiseries':'🥐','Pain artisanal':'🍞','Pâtisserie':'🍰','Sans gluten':'🌾','Bio':'🌿','Massage':'💆','Yoga':'🧘','Méditation':'🕊️','Coiffure':'✂️','Barbier':'💈','Esthétique':'💄','Spa':'🛁','Naturopathie':'🌿','Ostéopathie':'🫁','Salle de sport':'🏋️','Coach privé':'💪','Natation':'🏊','Arts martiaux':'🥋','Pilates':'🧘','Crossfit':'⚡','Nautique':'⛵','Vélo':'🚵','Randonnée':'🥾','Visite guidée':'🗺️','Urbain':'🏙️','Plein air':'🌳','Culturel':'🎭','Aventure':'🧗','Détente':'😌','En famille':'👨‍👩‍👧'};
function getOpenStatus(horaires){
  if(!horaires||!Object.keys(horaires).some(k=>horaires[k]))return null;
  const now=new Date();
  const todayFr=['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][now.getDay()];
  const h=horaires[todayFr];
  if(!h||!h.ouvert||!Array.isArray(h.creneaux))return 'closed';
  const cur=now.getHours()*60+now.getMinutes();
  const toMins=t=>{const[hh,mm]=t.split(':').map(Number);return hh*60+mm;};
  for(const[s,e]of h.creneaux){
    if(!s||!e)continue;
    let start=toMins(s),end=toMins(e);
    if(end===0)end=1440;
    if(end<=start)end+=1440;
    if(cur>=start&&cur<end)return(end-cur)<=30?'soon':'open';
  }
  return 'closed';
}


function useInView(ref) {
  const [v,setV]=useState(false);
  useEffect(()=>{
    const o=new IntersectionObserver(([e])=>{if(e.isIntersecting)setV(true);},{threshold:0.1});
    if(ref.current)o.observe(ref.current);
    return()=>o.disconnect();
  },[]);
  return v;
}
function FadeUp({children,delay=0,style={}}) {
  const ref=useRef(); const v=useInView(ref);
  return <div ref={ref} style={{opacity:v?1:0,transform:v?"none":"translateY(22px)",transition:`opacity .65s ease ${delay}s,transform .65s ease ${delay}s`,...style}}>{children}</div>;
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:rgba(107,29,29,.25);border-radius:2px;}
html{scroll-behavior:smooth;}
body{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}
.fd{font-family:'Cormorant Garamond',serif;}
.fb{font-family:'DM Sans',sans-serif;}
.nav{position:fixed;top:16px;left:16px;right:16px;z-index:200;height:58px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:rgba(247,243,238,.88);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-radius:16px;border:1px solid rgba(107,29,29,.09);box-shadow:0 4px 32px rgba(28,18,8,.08),0 1px 0 rgba(255,255,255,.55) inset;}
.logo{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:#1C1208;cursor:pointer;letter-spacing:-.01em;}
.logo em{font-style:italic;color:#6B1D1D;}
.nav-links{display:flex;gap:32px;list-style:none;}
.nav-links a{font-family:'DM Sans',sans-serif;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#7A6555;text-decoration:none;cursor:pointer;transition:color .2s;}
.nav-links a:hover{color:#6B1D1D;}
.nav-cta{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;background:#1C1208;color:#F7F3EE;padding:10px 22px;border-radius:10px;border:none;cursor:pointer;transition:all .25s ease;box-shadow:0 2px 8px rgba(28,18,8,.18);}
.nav-cta:hover{background:#6B1D1D;transform:translateY(-1px);box-shadow:0 4px 20px rgba(107,29,29,.3);}
.hero{min-height:100dvh;padding:148px 52px 80px;display:flex;flex-direction:column;justify-content:center;position:relative;overflow:hidden;background:#F7F3EE;}
.hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 60% 35%,rgba(107,29,29,.055) 0%,transparent 70%),radial-gradient(ellipse 50% 40% at 10% 85%,rgba(28,18,8,.035) 0%,transparent 60%);pointer-events:none;}
.hero-badge{display:inline-flex;align-items:center;gap:10px;margin-bottom:44px;background:rgba(107,29,29,.055);border:1px solid rgba(107,29,29,.12);border-radius:100px;padding:8px 18px;width:fit-content;}
.badge-dot{width:6px;height:6px;border-radius:50%;background:#6B1D1D;animation:ripple 2.5s ease-in-out infinite;flex-shrink:0;}
@keyframes ripple{0%{box-shadow:0 0 0 0 rgba(107,29,29,.45);}70%{box-shadow:0 0 0 9px rgba(107,29,29,0);}100%{box-shadow:0 0 0 0 rgba(107,29,29,0);}}
.badge-txt{font-family:'DM Sans',sans-serif;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#6B1D1D;font-weight:500;}
.hero-title{font-family:'Cormorant Garamond',serif;font-size:clamp(58px,9vw,118px);font-weight:600;line-height:.92;color:#1C1208;margin-bottom:44px;position:relative;z-index:1;max-width:14ch;}
.hero-title em{font-style:italic;color:#6B1D1D;position:relative;}
.hero-title em::after{content:'';position:absolute;left:0;bottom:5px;width:100%;height:1.5px;background:linear-gradient(90deg,#6B1D1D,rgba(107,29,29,.12));transform:scaleX(0);transform-origin:left;animation:drawLine 1.2s cubic-bezier(.16,1,.3,1) 1s forwards;}
@keyframes drawLine{to{transform:scaleX(1);}}
.hero-foot{display:flex;align-items:flex-end;justify-content:space-between;gap:48px;flex-wrap:wrap;position:relative;z-index:1;}
.hero-desc{font-family:'DM Sans',sans-serif;font-size:16px;font-weight:300;color:#7A6555;line-height:1.8;max-width:360px;}
.hero-actions{display:flex;flex-direction:column;align-items:flex-end;gap:16px;}
.btn-primary{display:inline-flex;align-items:center;gap:12px;background:#1C1208;color:#F7F3EE;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;padding:17px 34px;border-radius:12px;border:none;cursor:pointer;transition:all .35s cubic-bezier(.16,1,.3,1);box-shadow:0 4px 20px rgba(28,18,8,.2);letter-spacing:.015em;white-space:nowrap;}
.btn-primary:hover{background:#6B1D1D;transform:translateY(-2px);box-shadow:0 8px 32px rgba(107,29,29,.28);}
.hero-note{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:300;color:rgba(122,101,85,.38);letter-spacing:.05em;}
.hero-stats{display:flex;gap:44px;flex-wrap:wrap;padding-top:64px;border-top:1px solid rgba(107,29,29,.08);margin-top:64px;position:relative;z-index:1;}
.stat-item{display:flex;flex-direction:column;gap:5px;}
.stat-num{font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:600;color:#1C1208;line-height:1;}
.stat-label{font-family:'DM Sans',sans-serif;font-size:10px;font-weight:400;color:#7A6555;letter-spacing:.1em;text-transform:uppercase;}
.ticker-wrap{overflow:hidden;padding:14px 0;border-top:1px solid rgba(107,29,29,.07);border-bottom:1px solid rgba(107,29,29,.07);background:rgba(107,29,29,.018);}
.ticker{display:flex;width:max-content;animation:scroll 22s linear infinite;}
.ticker:hover{animation-play-state:paused;}
.ticker-item{font-family:'Cormorant Garamond',serif;font-size:13px;font-style:italic;color:rgba(107,29,29,.38);padding:0 28px;white-space:nowrap;}
.ticker-item::after{content:'·';opacity:.28;margin-left:28px;}
@keyframes scroll{from{transform:translateX(0);}to{transform:translateX(-50%);}}
.section{padding:104px 52px;}
.sec-tag{font-family:'DM Sans',sans-serif;font-size:10px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:#6B1D1D;margin-bottom:18px;display:flex;align-items:center;gap:12px;}
.sec-tag::before{content:'';width:24px;height:1px;background:#6B1D1D;display:block;}
.sec-title{font-family:'Cormorant Garamond',serif;font-size:clamp(38px,5.5vw,64px);font-weight:600;line-height:1.04;color:#1C1208;margin-bottom:64px;}
.sec-title em{font-style:italic;color:#6B1D1D;}
.div-label{display:flex;align-items:center;gap:24px;padding:0 52px;}
.div-line{flex:1;height:1px;background:rgba(107,29,29,.08);}
.div-txt{font-family:'Cormorant Garamond',serif;font-size:12px;font-style:italic;color:rgba(107,29,29,.27);letter-spacing:.06em;white-space:nowrap;}
.how-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(107,29,29,.07);border-radius:20px;overflow:hidden;}
.how-card{padding:52px 44px;background:#FDFAF6;position:relative;overflow:hidden;transition:background .3s ease;}
.how-card:hover{background:#FAF4EC;}
.how-card::after{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#6B1D1D,rgba(107,29,29,.15));transform:scaleX(0);transform-origin:left;transition:transform .5s cubic-bezier(.16,1,.3,1);}
.how-card:hover::after{transform:scaleX(1);}
.how-icon{width:46px;height:46px;border-radius:13px;background:rgba(107,29,29,.06);border:1px solid rgba(107,29,29,.1);display:flex;align-items:center;justify-content:center;margin-bottom:26px;transition:all .3s ease;color:#6B1D1D;flex-shrink:0;}
.how-card:hover .how-icon{background:#6B1D1D;color:#F7F3EE;border-color:#6B1D1D;transform:scale(1.05);}
.how-num{font-family:'Cormorant Garamond',serif;font-size:76px;font-weight:600;color:rgba(107,29,29,.048);line-height:1;margin-bottom:14px;}
.how-title{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:600;color:#1C1208;margin-bottom:10px;}
.how-desc{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:#7A6555;line-height:1.82;}
.how-more-btn{background:none;border:none;font-size:13px;color:rgba(107,29,29,.55);cursor:pointer;padding:8px 0;text-decoration:underline;text-underline-offset:3px;transition:color .2s;}
.how-more-btn:hover{color:#6B1D1D;}
.ccm-page{max-width:680px;margin:0 auto;padding:100px 24px 80px;}
.ccm-back{display:inline-flex;align-items:center;gap:6px;font-family:'DM Sans',sans-serif;font-size:13px;color:#7A6555;background:none;border:none;cursor:pointer;padding:0;margin-bottom:40px;transition:color .2s;}
.ccm-back:hover{color:#6B1D1D;}
.ccm-section-title{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:600;color:#1C1208;margin:48px 0 16px;}
.ccm-intro{font-family:'DM Sans',sans-serif;font-size:14px;color:#7A6555;line-height:1.75;margin:0;}
.ccm-steps{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:16px;}
.ccm-step-item{display:flex;gap:16px;align-items:flex-start;}
.ccm-step-num{width:28px;height:28px;border-radius:50%;background:#6B1D1D;color:#F7F3EE;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;}
.ccm-step-text{font-family:'DM Sans',sans-serif;font-size:14px;color:#4A3828;line-height:1.65;}
.ccm-avantages{display:flex;flex-direction:column;gap:12px;}
.ccm-avantage{display:flex;align-items:center;gap:12px;font-family:'DM Sans',sans-serif;font-size:14px;color:#4A3828;}
.ccm-avantage-dot{width:8px;height:8px;border-radius:50%;background:#6B1D1D;flex-shrink:0;}
.ccm-faq{display:flex;flex-direction:column;gap:2px;}
.ccm-faq-item{border-bottom:1px solid rgba(107,29,29,.1);}
.ccm-faq-q{width:100%;background:none;border:none;text-align:left;padding:16px 0;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;color:#1C1208;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:12px;}
.ccm-faq-q:hover{color:#6B1D1D;}
.ccm-faq-a{font-family:'DM Sans',sans-serif;font-size:13px;color:#7A6555;line-height:1.7;padding-bottom:16px;}
.cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;}
.catcard{background:#FDFAF6;border:1px solid rgba(107,29,29,.09);border-radius:20px;padding:38px 34px;position:relative;overflow:hidden;transition:all .35s cubic-bezier(.16,1,.3,1);}
.catcard.active{cursor:pointer;}
.catcard.active:hover{transform:translateY(-5px);box-shadow:0 24px 60px rgba(28,18,8,.1);border-color:rgba(107,29,29,.2);background:#FAF4EC;}
.catcard.inactive{opacity:.42;cursor:default;}
.catcard::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#6B1D1D,rgba(107,29,29,.12));transform:scaleX(0);transform-origin:left;transition:transform .5s cubic-bezier(.16,1,.3,1);}
.catcard.active:hover::before{transform:scaleX(1);}
.catcard-icon-wrap{width:52px;height:52px;border-radius:14px;background:rgba(107,29,29,.055);border:1px solid rgba(107,29,29,.09);display:flex;align-items:center;justify-content:center;margin-bottom:24px;color:#6B1D1D;transition:all .3s ease;}
.catcard.active:hover .catcard-icon-wrap{background:#6B1D1D;color:#F7F3EE;border-color:#6B1D1D;transform:scale(1.05);}
.catcard-name{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:600;color:#1C1208;margin-bottom:8px;}
.catcard-desc{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:#7A6555;line-height:1.65;margin-bottom:24px;}
.catcard-foot{display:flex;justify-content:space-between;align-items:center;padding-top:18px;border-top:1px solid rgba(107,29,29,.07);}
.catcard-cta{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;color:#6B1D1D;letter-spacing:.02em;}
.catcard-soon{font-family:'DM Sans',sans-serif;font-size:10px;color:rgba(122,101,85,.42);letter-spacing:.12em;text-transform:uppercase;}
.catcard-arrow{width:32px;height:32px;border-radius:50%;border:1px solid rgba(107,29,29,.17);display:flex;align-items:center;justify-content:center;color:#6B1D1D;transition:all .35s cubic-bezier(.16,1,.3,1);font-size:15px;}
.catcard.active:hover .catcard-arrow{background:#6B1D1D;color:#F7F3EE;transform:rotate(45deg);border-color:#6B1D1D;}
.hero-photo .hero-badge{background:rgba(247,243,238,.1);border-color:rgba(247,243,238,.18);}
.hero-photo .badge-txt{color:rgba(247,243,238,.85);}
.hero-photo .badge-dot{background:rgba(247,243,238,.9);}
.hero-photo .hero-title{color:#F7F3EE;}
.hero-photo .hero-title em{color:rgba(247,243,238,.82);}
.hero-photo .hero-title em::after{background:linear-gradient(90deg,rgba(247,243,238,.55),rgba(247,243,238,.06));}
.hero-photo .hero-desc{color:rgba(247,243,238,.65);}
.hero-photo .hero-note{color:rgba(247,243,238,.35);}
.catcard-photo{position:relative;height:280px;border-radius:20px;overflow:hidden;cursor:pointer;transition:transform .35s cubic-bezier(.16,1,.3,1),box-shadow .35s;}
.catcard-photo.active:hover{transform:translateY(-5px);box-shadow:0 24px 60px rgba(28,18,8,.18);}
.catcard-photo.inactive{cursor:default;}
.catcard-photo-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .5s cubic-bezier(.16,1,.3,1);}
.catcard-photo.active:hover .catcard-photo-img{transform:scale(1.06);}
.catcard-photo-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(28,18,8,.08) 0%,rgba(28,18,8,.72) 100%);}
.catcard-photo.inactive .catcard-photo-overlay{background:linear-gradient(to bottom,rgba(28,18,8,.22) 0%,rgba(28,18,8,.78) 100%);}
.catcard-photo-content{position:absolute;bottom:0;left:0;right:0;padding:24px 28px;}
.catcard-photo-name{font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:700;color:#F7F3EE;line-height:1;margin-bottom:6px;}
.catcard-photo-cta{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:400;color:rgba(247,243,238,.6);letter-spacing:.04em;}
.catcard-photo-soon{display:inline-flex;align-items:center;background:rgba(247,243,238,.14);backdrop-filter:blur(6px);border-radius:100px;padding:4px 12px;font-family:'DM Sans',sans-serif;font-size:10px;font-weight:500;color:rgba(247,243,238,.7);letter-spacing:.12em;text-transform:uppercase;margin-top:6px;}
.catpage-hero{background:#1C1208;padding:120px 52px 60px;}
.catpage-back{display:inline-flex;align-items:center;gap:8px;font-family:'DM Sans',sans-serif;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:rgba(247,243,238,.5);margin-bottom:28px;cursor:pointer;border:none;background:none;padding:0;transition:color .2s;}
.catpage-back:hover{color:#F7F3EE;}
.catpage-icon{font-size:44px;margin-bottom:16px;display:block;}
.catpage-title{font-family:'Cormorant Garamond',serif;font-size:clamp(44px,6vw,72px);font-weight:700;color:#F7F3EE;line-height:.95;margin-bottom:12px;}
.catpage-title em{font-style:italic;color:rgba(247,243,238,.5);}
.catpage-sub{font-family:'DM Sans',sans-serif;font-size:14px;font-weight:300;color:rgba(247,243,238,.5);}
.partners-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;}
.pcard{background:#FDFAF6;border:1px solid rgba(107,29,29,.1);border-radius:18px;overflow:hidden;cursor:pointer;transition:transform .35s cubic-bezier(.16,1,.3,1),box-shadow .35s,border-color .35s;}
.pcard:hover{transform:translateY(-5px);box-shadow:0 24px 56px rgba(28,18,8,.1);border-color:rgba(107,29,29,.22);}
.pcard-img{height:200px;position:relative;overflow:hidden;background:#1C1208;}
.pcard-img img{width:100%;height:100%;object-fit:cover;transition:transform .5s;}
.pcard:hover .pcard-img img{transform:scale(1.04);}
.pcard-img::after{content:'';position:absolute;inset:0;background:linear-gradient(to bottom,transparent 40%,rgba(28,18,8,.4));}
.pcard-status{position:absolute;top:14px;right:14px;z-index:2;background:rgba(247,243,238,.92);backdrop-filter:blur(8px);border-radius:100px;padding:4px 12px;font-family:'DM Sans',sans-serif;font-size:11px;display:flex;align-items:center;gap:6px;}
.pcard-status.open{color:#2D6A4F;}.pcard-status.soon{color:#B45309;}.pcard-status.closed{color:#9B2335;}
.sdot{width:5px;height:5px;border-radius:50%;}.sdot.open{background:#2D6A4F;animation:ripple 2.2s infinite;}.sdot.soon{background:#FFB74D;}.sdot.closed{background:#9B2335;}
.pcard-body{padding:24px 26px 26px;}
.pcard-cat{font-family:'DM Sans',sans-serif;font-size:10px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:#6B1D1D;margin-bottom:7px;}
.pcard-name{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:600;color:#1C1208;margin-bottom:8px;line-height:1;}
.pcard-desc{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:#7A6555;line-height:1.65;margin-bottom:20px;}
.pcard-foot{display:flex;justify-content:space-between;align-items:center;padding-top:16px;border-top:1px solid rgba(107,29,29,.08);}
.pcard-cta{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;color:#6B1D1D;}
.pcard-icon{width:30px;height:30px;border-radius:50%;border:1px solid rgba(107,29,29,.2);display:flex;align-items:center;justify-content:center;font-size:14px;color:#6B1D1D;transition:all .3s;}
.pcard:hover .pcard-icon{background:#6B1D1D;color:#F7F3EE;transform:rotate(45deg);}
.snack-hero{min-height:60vh;position:relative;overflow:hidden;display:flex;align-items:flex-end;padding:80px 52px 60px;}
.snack-hero-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.snack-hero-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(28,18,8,.3) 0%,rgba(28,18,8,.75) 100%);}
.snack-hero-content{position:relative;z-index:1;color:#F7F3EE;}
.snack-back{display:inline-flex;align-items:center;gap:8px;font-family:'DM Sans',sans-serif;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:rgba(247,243,238,.6);margin-bottom:24px;cursor:pointer;border:none;background:none;padding:0;transition:color .2s;}
.snack-back:hover{color:#F7F3EE;}
.snack-name{font-family:'Cormorant Garamond',serif;font-size:clamp(48px,7vw,80px);font-weight:700;line-height:.95;margin-bottom:16px;}
.snack-meta{display:flex;gap:24px;flex-wrap:wrap;}
.snack-meta-item{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:rgba(247,243,238,.65);}
.hours-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:64px;}
.hours-card{background:#FDFAF6;border:1px solid rgba(107,29,29,.09);border-radius:18px;padding:28px 26px;position:relative;overflow:hidden;transition:box-shadow .25s;}
.hours-card.today{background:#FAF4EC;border-color:rgba(107,29,29,.18);box-shadow:0 4px 20px rgba(107,29,29,.07);}
.hours-card.today::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#6B1D1D,rgba(107,29,29,.2));}
.hours-day{font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:600;color:#1C1208;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;}
.hours-open-dot{width:7px;height:7px;border-radius:50%;background:#2D6A4F;box-shadow:0 0 0 3px rgba(45,106,79,.15);flex-shrink:0;}
.hours-slot{display:inline-flex;align-items:center;gap:8px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:400;color:#3D2B1F;margin-bottom:7px;letter-spacing:-.01em;}
.hours-slot::before{content:'';width:4px;height:4px;border-radius:50%;background:rgba(107,29,29,.3);flex-shrink:0;}
.tabs{display:flex;gap:4px;margin-bottom:40px;background:rgba(107,29,29,.04);padding:4px;border-radius:5px;width:fit-content;}
.tab{font-family:'DM Sans',sans-serif;font-size:13px;padding:10px 20px;border-radius:3px;border:none;cursor:pointer;background:transparent;color:#7A6555;transition:all .2s;}
.tab.active{background:#6B1D1D;color:#F7F3EE;}
.menu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-bottom:48px;}
.mitem{background:#FDFAF6;border:1px solid rgba(107,29,29,.1);border-radius:6px;overflow:hidden;transition:all .25s;}
.mitem:hover{border-color:rgba(107,29,29,.2);box-shadow:0 8px 24px rgba(28,18,8,.07);}
.mitem-img{height:180px;overflow:hidden;background:#1C1208;}
.mitem-img img{width:100%;height:100%;object-fit:cover;transition:transform .4s;}
.mitem:hover .mitem-img img{transform:scale(1.05);}
.mitem-body{padding:18px 20px;}
.mitem-name{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#1C1208;margin-bottom:5px;}
.mitem-desc{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:300;color:#9A8878;line-height:1.6;margin-bottom:14px;}
.mitem-foot{display:flex;justify-content:space-between;align-items:center;}
.mitem-price{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;color:#6B1D1D;}
.chip{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:400;border:1px solid rgba(107,29,29,.14);border-radius:100px;padding:9px 20px;cursor:pointer;background:white;color:#4A3728;transition:all .22s ease;display:inline-flex;align-items:center;gap:7px;line-height:1;white-space:nowrap;}
.chip:hover:not(:disabled){border-color:rgba(107,29,29,.28);background:rgba(107,29,29,.03);}
button.chip.sel,button.chip.sel:hover{background:#1C1208;color:#F7F3EE;border-color:#1C1208;box-shadow:0 2px 10px rgba(28,18,8,.2);}button.chip.sel svg{stroke:#F7F3EE;}
.chip.off{opacity:.35;text-decoration:line-through;background:rgba(107,29,29,.03);}
.chip.off:hover:not(:disabled){opacity:.55;}
.chip:disabled{opacity:.22;cursor:not-allowed;}
.config-panel{background:#F9F5EF;border:1px solid rgba(107,29,29,.08);border-radius:16px;padding:22px 20px;margin-top:14px;}
.cfg-section{margin-bottom:20px;}
.cfg-label{font-family:'DM Sans',sans-serif;font-size:10px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:#6B1D1D;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;}
.cfg-label-left{display:flex;align-items:center;gap:10px;}
.cfg-label-left::before{content:'';width:14px;height:1px;background:#6B1D1D;display:block;}
.cfg-hint{font-family:'DM Sans',sans-serif;font-size:10px;font-weight:400;color:rgba(122,101,85,.5);letter-spacing:.04em;text-transform:none;}
.cfg-toggle{display:flex;gap:0;background:rgba(107,29,29,.06);border-radius:12px;padding:3px;margin-bottom:4px;}
.cfg-toggle-btn{flex:1;padding:10px 14px;border-radius:9px;border:none;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:400;cursor:pointer;transition:all .2s ease;text-align:center;}
.cfg-toggle-btn.active,.cfg-toggle-btn.active:hover{background:#1C1208;color:#F7F3EE;box-shadow:0 2px 8px rgba(28,18,8,.2);font-weight:500;}
.cfg-toggle-btn.inactive{background:transparent;color:#7A6555;}
.add-btn{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;background:#1C1208;color:#F7F3EE;border:none;border-radius:12px;padding:13px 20px;cursor:pointer;transition:all .3s ease;letter-spacing:.015em;box-shadow:0 2px 10px rgba(28,18,8,.18);}
.add-btn:hover{background:#6B1D1D;transform:translateY(-1px);box-shadow:0 4px 18px rgba(107,29,29,.28);}
.add-btn:disabled{background:rgba(107,29,29,.18);cursor:not-allowed;transform:none;box-shadow:none;}
.size-btns{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;}
.size-btn{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;border:1px solid rgba(107,29,29,.2);border-radius:4px;padding:7px 14px;cursor:pointer;background:white;color:#7A6555;transition:all .2s;}
.size-btn.sel{background:#6B1D1D;color:#F7F3EE;border-color:#6B1D1D;}
.viande-row{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(107,29,29,.06);}
.viande-row:last-child{border-bottom:none;}
.viande-name{font-family:'DM Sans',sans-serif;font-size:13px;color:#1C1208;}
.viande-ctrl{display:flex;align-items:center;gap:10px;}
.viande-cnt{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:#6B1D1D;min-width:20px;text-align:center;}
.v-btn{width:26px;height:26px;border-radius:50%;border:1px solid rgba(107,29,29,.25);background:white;color:#6B1D1D;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;line-height:1;}
.v-btn:hover{background:#6B1D1D;color:#F7F3EE;}.v-btn:disabled{opacity:.25;cursor:not-allowed;}
.cart-section{background:#1C1208;border-radius:16px;padding:32px;margin-top:48px;}
.cart-title{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:600;color:#F7F3EE;margin-bottom:24px;}
.cart-title em{font-style:italic;color:rgba(247,243,238,.4);}
.cart-item{display:flex;justify-content:space-between;align-items:flex-start;padding:14px 0;border-bottom:1px solid rgba(247,243,238,.07);}
.cart-item:last-of-type{border-bottom:none;}
.cart-item-name{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:#F7F3EE;margin-bottom:4px;}
.cart-item-detail{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:300;color:rgba(247,243,238,.4);line-height:1.6;}
.cart-item-right{display:flex;flex-direction:column;align-items:flex-end;gap:6px;margin-left:16px;}
.cart-item-price{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:#F7F3EE;white-space:nowrap;}
.cart-remove{font-family:'DM Sans',sans-serif;font-size:11px;color:rgba(247,243,238,.3);cursor:pointer;border:none;background:none;padding:0;transition:color .2s;}
.cart-remove:hover{color:#F87171;}
.cart-total{display:flex;justify-content:space-between;align-items:center;padding-top:20px;border-top:1px solid rgba(247,243,238,.15);margin-top:8px;}
.cart-total-label{font-family:'DM Sans',sans-serif;font-size:13px;color:rgba(247,243,238,.5);}
.cart-total-amount{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:600;color:#F7F3EE;}
.checkout-box{background:#FDFAF6;border:1px solid rgba(107,29,29,.1);border-radius:8px;padding:32px;margin-top:24px;}
.op-section{margin-bottom:24px;}
.op-label{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:#6B1D1D;margin-bottom:10px;display:flex;align-items:center;gap:8px;}
.op-label::before{content:'';width:20px;height:1px;background:#6B1D1D;}
.input{width:100%;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:300;color:#1C1208;background:white;border:1px solid rgba(107,29,29,.15);border-radius:4px;padding:13px 16px;outline:none;transition:border-color .2s;}
.input:focus{border-color:#6B1D1D;}
.time-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:8px;}
.time-btn{font-family:'DM Sans',sans-serif;font-size:13px;color:#7A6555;border:1px solid rgba(107,29,29,.15);border-radius:4px;padding:10px;text-align:center;cursor:pointer;background:white;transition:all .2s;}
.time-btn.sel{background:#6B1D1D;color:#F7F3EE;border-color:#6B1D1D;}
.btn-call{width:100%;display:flex;align-items:center;justify-content:center;gap:12px;background:#6B1D1D;color:#F7F3EE;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:500;padding:18px;border-radius:4px;border:none;cursor:pointer;transition:background .25s,transform .2s;}
.btn-call:hover{background:#4A1212;transform:translateY(-2px);}
.btn-call:disabled{background:rgba(107,29,29,.25);cursor:not-allowed;transform:none;}
.call-note{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:300;color:rgba(122,101,85,.45);text-align:center;margin-top:12px;}
.success{text-align:center;padding:60px 20px;}
.success-icon{font-size:48px;margin-bottom:20px;}
.success-title{font-family:'Cormorant Garamond',serif;font-size:40px;font-weight:600;color:#1C1208;margin-bottom:12px;}
.success-desc{font-family:'DM Sans',sans-serif;font-size:14px;font-weight:300;color:#7A6555;line-height:1.7;}
.footer{border-top:1px solid rgba(107,29,29,.07);padding:52px 52px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;background:#F7F3EE;}
.footer-logo{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:700;color:#1C1208;}.footer-logo em{font-style:italic;color:#6B1D1D;}
.footer-copy{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:300;color:rgba(122,101,85,.33);}
.footer-links{display:flex;align-items:center;gap:20px;flex-wrap:wrap;}
.footer-link{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:300;color:rgba(122,101,85,.55);text-decoration:none;cursor:pointer;transition:color .2s;background:none;border:none;padding:0;}
.footer-link:hover{color:#6B1D1D;}
.footer-link-commerce{color:rgba(122,101,85,.36);}
.footer-link-commerce:hover{color:rgba(107,29,29,.58);}
.visit-mode-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:8px;}
.visit-mode-card{background:#FDFAF6;border:1px solid rgba(107,29,29,.09);border-radius:20px;padding:36px 32px;cursor:pointer;transition:all .35s cubic-bezier(.16,1,.3,1);position:relative;overflow:hidden;display:flex;flex-direction:column;}
.visit-mode-card:hover{transform:translateY(-4px);box-shadow:0 20px 50px rgba(28,18,8,.09);border-color:rgba(107,29,29,.2);background:#FAF4EC;}
.visit-mode-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#6B1D1D,rgba(107,29,29,.12));transform:scaleX(0);transform-origin:left;transition:transform .5s cubic-bezier(.16,1,.3,1);}
.visit-mode-card:hover::before{transform:scaleX(1);}
.visit-mode-icon{width:48px;height:48px;border-radius:13px;background:rgba(107,29,29,.055);border:1px solid rgba(107,29,29,.09);display:flex;align-items:center;justify-content:center;margin-bottom:20px;color:#6B1D1D;transition:all .3s ease;flex-shrink:0;}
.visit-mode-card:hover .visit-mode-icon{background:#6B1D1D;color:#F7F3EE;border-color:#6B1D1D;}
.visit-mode-title{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;color:#1C1208;margin-bottom:8px;}
.visit-mode-desc{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:#7A6555;line-height:1.65;margin-bottom:20px;flex:1;}
.visit-mode-foot{display:flex;justify-content:space-between;align-items:center;padding-top:16px;border-top:1px solid rgba(107,29,29,.07);}
.visit-mode-cta{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;color:#6B1D1D;}
.visit-mode-arrow{width:30px;height:30px;border-radius:50%;border:1px solid rgba(107,29,29,.17);display:flex;align-items:center;justify-content:center;color:#6B1D1D;transition:all .3s;font-size:14px;}
.visit-mode-card:hover .visit-mode-arrow{background:#6B1D1D;color:#F7F3EE;transform:rotate(45deg);border-color:#6B1D1D;}
.visit-back{display:inline-flex;align-items:center;gap:8px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:400;letter-spacing:.12em;text-transform:uppercase;color:rgba(122,101,85,.55);background:none;border:none;cursor:pointer;padding:0;margin-bottom:36px;transition:color .2s;}
.visit-back:hover{color:#6B1D1D;}
.visit-qr-wrap{display:flex;flex-direction:column;align-items:center;gap:24px;padding:8px 0 48px;}
.visit-qr-card{background:#FDFAF6;border:1px solid rgba(107,29,29,.1);border-radius:24px;overflow:hidden;width:100%;max-width:360px;box-shadow:0 16px 48px rgba(28,18,8,.1);}
.visit-qr-card-header{background:linear-gradient(135deg,#1C1208 0%,#2E1F0E 100%);padding:28px 28px 24px;text-align:center;}
.visit-qr-partner{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:600;color:#F7F3EE;letter-spacing:.01em;margin-bottom:6px;}
.visit-qr-partner-tag{font-family:'DM Sans',sans-serif;font-size:10px;font-weight:500;color:rgba(247,243,238,.45);letter-spacing:.12em;text-transform:uppercase;}
.visit-qr-box{background:white;display:flex;justify-content:center;padding:28px;border-bottom:1px solid rgba(107,29,29,.06);}
.visit-qr-client{text-align:center;padding:24px 28px 0;}
.visit-qr-name{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:600;color:#1C1208;margin-bottom:6px;}
.visit-qr-sub{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:300;color:#7A6555;line-height:1.7;}
.visit-qr-countdown-wrap{text-align:center;padding:20px 28px 28px;}
.visit-qr-countdown-label{font-family:'DM Sans',sans-serif;font-size:10px;font-weight:500;color:rgba(122,101,85,.55);letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;}
.visit-qr-countdown{font-family:'Cormorant Garamond',serif;font-size:42px;font-weight:600;color:#6B1D1D;letter-spacing:.04em;line-height:1;}
.visit-qr-countdown.expired{color:#aaa;}
.visit-qr-progress{height:3px;background:rgba(107,29,29,.1);border-radius:2px;margin-top:16px;overflow:hidden;}
.visit-qr-progress-bar{height:100%;background:linear-gradient(90deg,#6B1D1D,rgba(107,29,29,.4));border-radius:2px;transition:width 1s linear;}
@media(max-width:768px){
.nav{top:12px;left:12px;right:12px;padding:0 20px;height:54px;}
.nav-links{display:none;}
.hero{padding:120px 24px 60px;}
.hero-foot{flex-direction:column;align-items:flex-start;gap:32px;}
.hero-actions{align-items:flex-start;}
.hero-stats{gap:28px;padding-top:44px;margin-top:44px;}
.how-grid{grid-template-columns:1fr;}
.how-section .sec-title{margin-bottom:28px;}
.how-card{padding:20px 18px;}
.how-icon{width:38px;height:38px;margin-bottom:10px;}
.how-num{font-size:40px;margin-bottom:4px;}
.how-title{font-size:20px;margin-bottom:5px;}
.how-desc{font-size:12px;line-height:1.6;}
.section{padding:52px 24px;}
.catpage-hero{padding:100px 24px 48px;}
.snack-hero{padding:100px 24px 40px;}
.div-label{padding:0 24px;}
.footer{padding:40px 24px;flex-direction:column;align-items:flex-start;gap:12px;}.footer-links{gap:14px;}
.checkout-box{padding:24px 16px;}
.cart-section{padding:24px 16px;}
.tabs{flex-wrap:wrap;}
.visit-mode-grid{grid-template-columns:1fr;}

.scan-page{min-height:100vh;background:#F7F3EE;display:flex;flex-direction:column;}
.scan-header{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid rgba(107,29,29,.08);}
.scan-header-tag{font-family:'DM Sans',sans-serif;font-size:10px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:rgba(122,101,85,.5);background:rgba(107,29,29,.07);padding:5px 12px;border-radius:20px;}
.scan-body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:40px 24px 48px;max-width:480px;width:100%;margin:0 auto;}
.scan-title{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:600;color:#1C1208;text-align:center;margin-bottom:6px;line-height:1.2;}
.scan-sub{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:#7A6555;text-align:center;margin-bottom:32px;line-height:1.6;}
.scan-reader-wrap{width:100%;border-radius:20px;overflow:hidden;border:1px solid rgba(107,29,29,.1);background:#1C1208;box-shadow:0 8px 40px rgba(28,18,8,.15);}
#qr-reader{width:100% !important;}
#qr-reader video{width:100% !important;height:auto !important;display:block;}
#qr-reader img{display:none;}
.scan-result-wrap{display:flex;flex-direction:column;align-items:center;gap:28px;width:100%;}
.scan-result{background:#FDFAF6;border-radius:24px;padding:40px 32px;text-align:center;width:100%;border:1px solid rgba(107,29,29,.08);}
.scan-ok{border-color:rgba(34,130,70,.2);}
.scan-err{border-color:rgba(180,40,40,.15);}
.scan-result-icon{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;}
.scan-ok .scan-result-icon{background:rgba(34,130,70,.1);}
.scan-err .scan-result-icon{background:rgba(180,40,40,.08);}
.scan-result-status{font-family:'DM Sans',sans-serif;font-size:10px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;margin-bottom:12px;}
.scan-ok .scan-result-status{color:rgba(34,130,70,.8);}
.scan-err .scan-result-status{color:rgba(180,40,40,.7);}
.scan-result-name{font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;color:#1C1208;margin-bottom:8px;line-height:1.1;}
.scan-result-meta{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:400;color:#7A6555;line-height:1.8;}
.scan-result-reduction{margin:16px 0 8px;padding:16px 24px;background:rgba(107,29,29,.07);border-radius:14px;border:1px solid rgba(107,29,29,.15);}
.scan-result-reduction-label{font-family:'DM Sans',sans-serif;font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:rgba(107,29,29,.6);margin-bottom:6px;}
.scan-result-reduction-value{font-family:'Cormorant Garamond',serif;font-size:44px;font-weight:700;color:#6B1D1D;line-height:1;}
.scan-err-msg{font-family:'DM Sans',sans-serif;font-size:14px;font-weight:400;color:rgba(180,40,40,.85);line-height:1.6;margin-top:8px;}
.scan-again{display:inline-flex;align-items:center;gap:8px;background:#1C1208;color:#F7F3EE;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;padding:15px 32px;border-radius:12px;border:none;cursor:pointer;transition:all .3s;box-shadow:0 4px 20px rgba(28,18,8,.2);letter-spacing:.015em;}
.scan-again:hover{background:#6B1D1D;transform:translateY(-1px);}
.scan-err-detail{font-family:'DM Sans',sans-serif;font-size:11px;color:rgba(122,101,85,.5);margin-top:4px;}
}
@media(prefers-reduced-motion:reduce){
*{animation-duration:.01ms !important;transition-duration:.01ms !important;}
}
.join-wrap{min-height:100dvh;background:#F7F3EE;display:flex;flex-direction:column;align-items:center;padding:48px 20px 80px;}
.join-logo{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;color:#1C1208;letter-spacing:-.01em;margin-bottom:56px;cursor:pointer;}
.join-logo em{font-style:italic;color:#6B1D1D;}
.join-card{width:100%;max-width:600px;background:#FDFAF6;border:1px solid rgba(107,29,29,.09);border-radius:24px;padding:48px 44px;}
.join-title{font-family:'Cormorant Garamond',serif;font-size:clamp(32px,5vw,48px);font-weight:600;color:#1C1208;line-height:1.05;margin-bottom:10px;}
.join-title em{font-style:italic;color:#6B1D1D;}
.join-sub{font-family:'DM Sans',sans-serif;font-size:14px;font-weight:300;color:#7A6555;line-height:1.7;margin-bottom:44px;}
.join-field{margin-bottom:22px;}
.join-label{font-family:'DM Sans',sans-serif;font-size:10px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:#6B1D1D;margin-bottom:8px;display:flex;align-items:center;gap:8px;}
.join-label::before{content:'';width:14px;height:1px;background:#6B1D1D;display:block;}
.join-input{width:100%;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:300;color:#1C1208;background:white;border:1px solid rgba(107,29,29,.15);border-radius:8px;padding:13px 16px;outline:none;transition:border-color .2s;-webkit-appearance:none;}
.join-input:focus{border-color:#6B1D1D;}
.join-input::placeholder{color:rgba(122,101,85,.38);}
.join-textarea{width:100%;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:300;color:#1C1208;background:white;border:1px solid rgba(107,29,29,.15);border-radius:8px;padding:13px 16px;outline:none;transition:border-color .2s;resize:vertical;min-height:96px;line-height:1.6;font-family:'DM Sans',sans-serif;}
.join-textarea:focus{border-color:#6B1D1D;}
.join-textarea::placeholder{color:rgba(122,101,85,.38);}
.join-select{width:100%;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:300;color:#1C1208;background:white;border:1px solid rgba(107,29,29,.15);border-radius:8px;padding:13px 16px;outline:none;transition:border-color .2s;-webkit-appearance:none;appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B1D1D' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 16px center;}
.join-select:focus{border-color:#6B1D1D;}
.join-char{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:300;color:rgba(122,101,85,.45);text-align:right;margin-top:6px;}
.join-submit{width:100%;display:flex;align-items:center;justify-content:center;gap:12px;background:#1C1208;color:#F7F3EE;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:500;padding:17px;border-radius:10px;border:none;cursor:pointer;transition:all .35s cubic-bezier(.16,1,.3,1);box-shadow:0 4px 20px rgba(28,18,8,.2);letter-spacing:.015em;margin-top:12px;}
.join-submit:hover:not(:disabled){background:#6B1D1D;transform:translateY(-2px);box-shadow:0 8px 32px rgba(107,29,29,.28);}
.join-submit:disabled{opacity:.5;cursor:not-allowed;transform:none;}
.join-success{text-align:center;padding:32px 0;}
.join-success-icon{width:56px;height:56px;border-radius:50%;background:rgba(107,29,29,.06);border:1px solid rgba(107,29,29,.12);display:flex;align-items:center;justify-content:center;margin:0 auto 24px;}
.join-success-title{font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:600;color:#1C1208;margin-bottom:12px;}
.join-success-desc{font-family:'DM Sans',sans-serif;font-size:14px;font-weight:300;color:#7A6555;line-height:1.7;}
.join-err{font-family:'DM Sans',sans-serif;font-size:12px;color:#9B2335;margin-top:10px;text-align:center;}
.join-input-group{display:flex;}
.join-input-group .join-input{border-radius:8px 0 0 8px;border-right:none;flex:1;}
.join-input-suffix{font-family:'DM Sans',sans-serif;font-size:14px;font-weight:400;color:#7A6555;background:white;border:1px solid rgba(107,29,29,.15);border-left:none;border-radius:0 8px 8px 0;padding:13px 16px;flex-shrink:0;transition:border-color .2s;}
.join-input-group:focus-within .join-input-suffix{border-color:#6B1D1D;}
.join-input-group:focus-within .join-input{border-color:#6B1D1D;}
@media(max-width:640px){.join-card{padding:32px 24px;border-radius:16px;}.join-wrap{padding:32px 16px 64px;}}
.adm-login{width:100%;max-width:360px;background:rgba(247,243,238,.04);border:1px solid rgba(247,243,238,.08);border-radius:20px;padding:48px 36px;}
.adm-logo{font-size:22px;font-weight:700;color:#F7F3EE;display:block;margin-bottom:36px;}
.adm-logo em{font-style:italic;color:#6B1D1D;}
.adm-logo .fb{font-size:11px;font-weight:400;color:rgba(247,243,238,.3);letter-spacing:.14em;text-transform:uppercase;vertical-align:middle;}
.adm-input{width:100%;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:300;color:#F7F3EE;background:rgba(247,243,238,.06);border:1px solid rgba(247,243,238,.12);border-radius:8px;padding:13px 16px;outline:none;transition:border-color .2s;margin-bottom:12px;display:block;}
.adm-input:focus{border-color:#6B1D1D;}.adm-input::placeholder{color:rgba(247,243,238,.25);}
.adm-err{font-family:'DM Sans',sans-serif;font-size:12px;color:#EF4444;margin-bottom:12px;}
.adm-btn{width:100%;background:#6B1D1D;color:#F7F3EE;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;padding:14px;border-radius:8px;border:none;cursor:pointer;transition:all .25s;letter-spacing:.02em;display:block;}
.adm-btn:hover{background:#8B2929;transform:translateY(-1px);}
.adm-header{display:flex;align-items:center;gap:12px;padding:16px 24px;border-bottom:1px solid rgba(247,243,238,.06);flex-wrap:wrap;}
.adm-tabs{display:flex;gap:2px;background:rgba(247,243,238,.05);padding:3px;border-radius:8px;}
.adm-tab{font-family:'DM Sans',sans-serif;font-size:12px;padding:8px 16px;border-radius:6px;border:none;cursor:pointer;background:transparent;color:rgba(247,243,238,.4);transition:all .2s;letter-spacing:.04em;}
.adm-tab.act{background:#6B1D1D;color:#F7F3EE;}
.adm-logout{font-family:'DM Sans',sans-serif;font-size:11px;color:rgba(247,243,238,.28);background:none;border:none;cursor:pointer;margin-left:auto;letter-spacing:.06em;transition:color .2s;padding:8px 0;}
.adm-logout:hover{color:rgba(247,243,238,.7);}
.adm-refresh{background:none;border:none;cursor:pointer;color:rgba(247,243,238,.28);padding:6px;display:flex;align-items:center;justify-content:center;border-radius:6px;transition:color .2s,background .2s;}
.adm-refresh:hover{color:rgba(247,243,238,.7);background:rgba(247,243,238,.05);}
.adm-refresh:disabled{cursor:default;}
@keyframes adm-spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
.adm-content{padding:24px;max-width:860px;margin:0 auto;width:100%;}
.adm-filters{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px;}
.adm-filter{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:400;padding:6px 14px;border-radius:100px;border:1px solid rgba(247,243,238,.09);background:transparent;color:rgba(247,243,238,.38);cursor:pointer;transition:all .2s;}
.adm-filter.act{background:#6B1D1D;color:#F7F3EE;border-color:#6B1D1D;}
.adm-list{display:flex;flex-direction:column;gap:2px;}
.adm-row{display:flex;align-items:center;gap:14px;padding:15px 18px;background:rgba(247,243,238,.025);border:1px solid rgba(247,243,238,.055);border-radius:10px;cursor:pointer;transition:background .18s,border-color .18s;}
.adm-row:hover{background:rgba(247,243,238,.05);border-color:rgba(247,243,238,.1);}
.adm-row-body{flex:1;min-width:0;}
.adm-row-name{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:600;color:#F7F3EE;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.adm-row-meta{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:300;color:rgba(247,243,238,.35);}
.adm-row-sub{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:300;color:rgba(247,243,238,.22);margin-top:2px;}
.adm-arrow{color:rgba(247,243,238,.18);font-size:20px;flex-shrink:0;}
.adm-empty{font-family:'DM Sans',sans-serif;font-size:13px;color:rgba(247,243,238,.25);padding:40px 0;text-align:center;}
.adm-deactivate{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:500;padding:7px 13px;border-radius:6px;border:1px solid rgba(239,68,68,.28);background:rgba(239,68,68,.07);color:#EF4444;cursor:pointer;transition:all .2s;flex-shrink:0;}
.adm-deactivate:hover{background:rgba(239,68,68,.16);}
.adm-overlay{position:fixed;inset:0;background:rgba(8,4,2,.8);backdrop-filter:blur(8px);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;}
.adm-modal{background:#1e130a;border:1px solid rgba(247,243,238,.09);border-radius:18px;width:100%;max-width:520px;max-height:90dvh;overflow-y:auto;display:flex;flex-direction:column;}
.adm-modal-head{display:flex;align-items:center;justify-content:space-between;padding:22px 26px 18px;border-bottom:1px solid rgba(247,243,238,.06);flex-shrink:0;}
.adm-modal-title{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;color:#F7F3EE;}
.adm-modal-close{background:none;border:none;color:rgba(247,243,238,.3);font-size:16px;cursor:pointer;padding:4px;transition:color .2s;line-height:1;}
.adm-modal-close:hover{color:#F7F3EE;}
.adm-modal-body{padding:20px 26px;display:flex;flex-direction:column;gap:12px;}
.adm-field{display:flex;flex-direction:column;gap:3px;}
.adm-field-label{font-family:'DM Sans',sans-serif;font-size:9px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:#6B1D1D;}
.adm-field-val{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:rgba(247,243,238,.78);line-height:1.55;}
.adm-modal-actions{display:flex;gap:6px;padding:18px 26px;border-top:1px solid rgba(247,243,238,.06);flex-wrap:wrap;flex-shrink:0;}
.adm-sbtn{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;padding:8px 14px;border-radius:7px;cursor:pointer;transition:all .2s;border:1px solid transparent;}
.adm-s-pending{background:rgba(217,119,6,.12);color:#D97706;border-color:rgba(217,119,6,.28);}.adm-s-pending:hover{background:rgba(217,119,6,.22);}
.adm-s-waiting{background:rgba(59,130,246,.12);color:#3B82F6;border-color:rgba(59,130,246,.28);}.adm-s-waiting:hover{background:rgba(59,130,246,.22);}
.adm-s-ok{background:rgba(16,185,129,.12);color:#10B981;border-color:rgba(16,185,129,.28);}.adm-s-ok:hover{background:rgba(16,185,129,.22);}
.adm-s-reject{background:rgba(239,68,68,.1);color:#EF4444;border-color:rgba(239,68,68,.24);}.adm-s-reject:hover{background:rgba(239,68,68,.2);}
.adm-confirm{padding:18px 26px 22px;border-top:1px solid rgba(247,243,238,.06);}
.adm-confirm-txt{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:rgba(247,243,238,.6);line-height:1.6;margin-bottom:14px;}
.adm-confirm-row{display:flex;gap:8px;}
.adm-confirm-cancel{flex:1;font-family:'DM Sans',sans-serif;font-size:13px;padding:11px;border-radius:8px;border:1px solid rgba(247,243,238,.1);background:transparent;color:rgba(247,243,238,.45);cursor:pointer;transition:all .2s;}
.adm-confirm-cancel:hover{color:#F7F3EE;border-color:rgba(247,243,238,.25);}
.adm-confirm-ok{flex:1;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;padding:11px;border-radius:8px;border:none;background:#EF4444;color:#fff;cursor:pointer;transition:background .2s;}
.adm-confirm-ok:hover{background:#DC2626;}
.adm-stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px;}
.adm-stat-card{background:rgba(247,243,238,.04);border:1px solid rgba(247,243,238,.07);border-radius:10px;padding:14px 12px;text-align:center;}
.adm-stat-num{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:600;color:#F7F3EE;line-height:1;margin-bottom:4px;}
.adm-stat-label{font-family:'DM Sans',sans-serif;font-size:9px;font-weight:400;letter-spacing:.14em;text-transform:uppercase;color:rgba(247,243,238,.32);}
.adm-global-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px;}
.adm-global-card{background:rgba(247,243,238,.04);border:1px solid rgba(247,243,238,.07);border-radius:10px;padding:16px 14px;text-align:center;}
.adm-global-card.accent{background:rgba(107,29,29,.18);border-color:rgba(107,29,29,.4);}
.adm-global-num{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:600;color:#F7F3EE;line-height:1;margin-bottom:5px;}
.adm-global-label{font-family:'DM Sans',sans-serif;font-size:9px;font-weight:400;letter-spacing:.14em;text-transform:uppercase;color:rgba(247,243,238,.32);}
.adm-global-card.accent .adm-global-label{color:rgba(247,243,238,.55);}
.adm-chart-wrap{background:rgba(247,243,238,.03);border:1px solid rgba(247,243,238,.06);border-radius:10px;padding:16px;margin-bottom:8px;}
.adm-top-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid rgba(247,243,238,.06);}
.adm-top-row:last-child{border-bottom:none;}
.adm-top-rank{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:rgba(247,243,238,.2);width:22px;flex-shrink:0;text-align:right;}
.adm-top-nom{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:400;color:rgba(247,243,238,.8);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.adm-top-ca{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:#F7F3EE;flex-shrink:0;}
.adm-top-txn{font-family:'DM Sans',sans-serif;font-size:10px;color:rgba(247,243,238,.3);flex-shrink:0;text-align:right;width:52px;}
.adm-hotel-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;}
.adm-hotel-card{background:rgba(107,29,29,.12);border:1px solid rgba(107,29,29,.3);border-radius:10px;padding:18px 16px;text-align:center;}
.adm-hotel-num{font-family:'Cormorant Garamond',serif;font-size:36px;font-weight:600;color:#F7F3EE;line-height:1;margin-bottom:5px;}
.adm-hotel-label{font-family:'DM Sans',sans-serif;font-size:9px;font-weight:400;letter-spacing:.14em;text-transform:uppercase;color:rgba(247,243,238,.45);}
.adm-section-label{font-family:'DM Sans',sans-serif;font-size:9px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:#6B1D1D;margin-bottom:10px;display:flex;align-items:center;gap:8px;}
.adm-section-label::before{content:'';width:12px;height:1px;background:#6B1D1D;display:block;}
.adm-visit-row{display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid rgba(247,243,238,.05);}
.adm-visit-row:last-child{border-bottom:none;}
.adm-visit-name{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:rgba(247,243,238,.75);}
.adm-visit-date{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:300;color:rgba(247,243,238,.3);margin-top:1px;}
@media(max-width:640px){.adm-content{padding:14px;}.adm-header{padding:12px 14px;}.adm-tabs{flex:1;}.adm-modal{border-radius:14px;}.adm-modal-head,.adm-modal-body,.adm-modal-actions,.adm-confirm{padding-left:18px;padding-right:18px;}.adm-stats-grid{grid-template-columns:repeat(3,1fr);gap:6px;}}
.prt-login-wrap{min-height:100dvh;background:#F7F3EE;display:flex;align-items:center;justify-content:center;padding:24px;}
.prt-login{width:100%;max-width:380px;background:#FDFAF6;border:1px solid rgba(107,29,29,.09);border-radius:24px;padding:48px 40px;}
.prt-logo{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;color:#1C1208;display:block;margin-bottom:24px;}
.prt-logo em{font-style:italic;color:#6B1D1D;}
.prt-login-title{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:600;color:#1C1208;margin-bottom:8px;}
.prt-login-sub{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:#7A6555;line-height:1.65;margin-bottom:28px;}
.prt-err{font-family:'DM Sans',sans-serif;font-size:12px;color:#9B2335;margin-bottom:12px;}
.prt-wrap{min-height:100dvh;background:#F7F3EE;display:flex;flex-direction:column;}
.prt-header{display:flex;align-items:center;justify-content:space-between;padding:18px 28px;border-bottom:1px solid rgba(107,29,29,.07);background:#F7F3EE;}
.prt-logo-sm{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:700;color:#1C1208;}
.prt-logo-sm em{font-style:italic;color:#6B1D1D;}
.prt-partner-name{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:400;color:#7A6555;letter-spacing:.04em;}
.prt-tabs-bar{display:flex;overflow-x:auto;border-bottom:1px solid rgba(107,29,29,.07);padding:0 24px;scrollbar-width:none;}
.prt-tabs-bar::-webkit-scrollbar{display:none;}
.prt-tab{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:400;padding:14px 18px;border:none;border-bottom:2px solid transparent;background:transparent;color:rgba(122,101,85,.55);cursor:pointer;transition:all .2s;white-space:nowrap;letter-spacing:.04em;margin-bottom:-1px;}
.prt-tab.act{color:#6B1D1D;border-bottom-color:#6B1D1D;font-weight:500;}
.prt-content{padding:28px 24px;max-width:720px;margin:0 auto;width:100%;}
.prt-section-label{font-family:'DM Sans',sans-serif;font-size:10px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:#6B1D1D;margin-bottom:12px;display:flex;align-items:center;gap:8px;}
.prt-section-label::before{content:'';width:14px;height:1px;background:#6B1D1D;display:block;}
.prt-photo-section{margin-bottom:28px;}
.prt-photo-area{display:flex;align-items:center;gap:16px;flex-wrap:wrap;}
.prt-photo-preview{width:88px;height:88px;object-fit:cover;border-radius:12px;border:1px solid rgba(107,29,29,.1);}
.prt-photo-placeholder{width:88px;height:88px;border:1px dashed rgba(107,29,29,.18);border-radius:12px;display:flex;align-items:center;justify-content:center;font-family:'DM Sans',sans-serif;font-size:11px;color:rgba(122,101,85,.45);text-align:center;}
.prt-photo-btn{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;color:#6B1D1D;border:1px solid rgba(107,29,29,.2);border-radius:8px;padding:9px 16px;cursor:pointer;background:white;transition:all .2s;}
.prt-photo-btn:hover{background:rgba(107,29,29,.04);}
.prt-form{display:flex;flex-direction:column;gap:18px;}
.prt-field{display:flex;flex-direction:column;gap:6px;}
.prt-label{font-family:'DM Sans',sans-serif;font-size:10px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:#6B1D1D;display:flex;align-items:center;gap:8px;}
.prt-label::before{content:'';width:14px;height:1px;background:#6B1D1D;display:block;}
.prt-input{width:100%;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:300;color:#1C1208;background:white;border:1px solid rgba(107,29,29,.15);border-radius:8px;padding:12px 14px;outline:none;transition:border-color .2s;}
.prt-input:focus{border-color:#6B1D1D;}.prt-input::placeholder{color:rgba(122,101,85,.38);}
.prt-textarea{width:100%;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:300;color:#1C1208;background:white;border:1px solid rgba(107,29,29,.15);border-radius:8px;padding:12px 14px;outline:none;transition:border-color .2s;resize:vertical;min-height:90px;line-height:1.6;}
.prt-textarea:focus{border-color:#6B1D1D;}.prt-textarea::placeholder{color:rgba(122,101,85,.38);}
.prt-btn-primary{font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;background:#1C1208;color:#F7F3EE;padding:13px 28px;border-radius:10px;border:none;cursor:pointer;transition:all .3s ease;letter-spacing:.015em;box-shadow:0 2px 10px rgba(28,18,8,.18);}
.prt-btn-primary:hover:not(:disabled){background:#6B1D1D;transform:translateY(-1px);box-shadow:0 4px 18px rgba(107,29,29,.28);}
.prt-btn-primary:disabled{opacity:.5;cursor:not-allowed;}
.prt-btn-secondary{font-family:'DM Sans',sans-serif;font-size:14px;font-weight:400;background:transparent;color:#7A6555;padding:13px 24px;border-radius:10px;border:1px solid rgba(107,29,29,.15);cursor:pointer;transition:all .2s;}
.prt-btn-secondary:hover{border-color:rgba(107,29,29,.3);color:#1C1208;}
.prt-btn-danger{font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;background:transparent;color:#B91C1C;padding:13px 24px;border-radius:10px;border:1px solid rgba(185,28,28,.3);cursor:pointer;transition:all .2s;letter-spacing:.015em;}
.prt-btn-danger:hover:not(:disabled){background:rgba(185,28,28,.06);border-color:#B91C1C;}
.prt-btn-danger:disabled{opacity:.5;cursor:not-allowed;}
.prt-add-btn{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;background:rgba(107,29,29,.05);color:#6B1D1D;padding:13px 20px;border-radius:10px;border:1px solid rgba(107,29,29,.13);cursor:pointer;transition:all .2s;margin-bottom:20px;display:block;width:100%;text-align:center;}
.prt-add-btn:hover{background:rgba(107,29,29,.09);}
.prt-menu-form{background:#FDFAF6;border:1px solid rgba(107,29,29,.09);border-radius:16px;padding:24px;margin-bottom:20px;display:flex;flex-direction:column;gap:16px;}
.prt-menu-list{display:flex;flex-direction:column;gap:10px;}
.prt-menu-item{background:#FDFAF6;border:1px solid rgba(107,29,29,.09);border-radius:14px;display:flex;align-items:flex-start;gap:14px;padding:16px;transition:border-color .2s;}
.prt-menu-item:hover{border-color:rgba(107,29,29,.18);}
.prt-menu-item-img{width:72px;height:72px;object-fit:cover;border-radius:8px;flex-shrink:0;}
.prt-menu-item-body{flex:1;min-width:0;}
.prt-menu-item-name{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#1C1208;margin-bottom:4px;}
.prt-menu-item-desc{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:300;color:#7A6555;line-height:1.55;margin-bottom:6px;}
.prt-menu-item-price{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:#6B1D1D;}
.prt-menu-item-actions{display:flex;flex-direction:column;gap:6px;flex-shrink:0;}
.prt-delete-confirm{display:flex;flex-direction:column;align-items:flex-end;gap:5px;}
.prt-btn-ghost-sm{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:400;padding:6px 11px;border-radius:6px;border:1px solid rgba(107,29,29,.14);background:transparent;color:#7A6555;cursor:pointer;transition:all .18s;white-space:nowrap;}
.prt-btn-ghost-sm:hover{border-color:rgba(107,29,29,.28);color:#1C1208;}
.prt-btn-danger-sm{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:400;padding:6px 11px;border-radius:6px;border:1px solid rgba(155,35,53,.2);background:transparent;color:#9B2335;cursor:pointer;transition:all .18s;white-space:nowrap;}
.prt-btn-danger-sm:hover{background:rgba(155,35,53,.06);}
.prt-stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:28px;}
.prt-deconnect{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:400;color:rgba(122,101,85,.45);background:none;border:none;cursor:pointer;transition:color .2s;letter-spacing:.04em;padding:0;white-space:nowrap;}
.prt-deconnect:hover{color:#6B1D1D;}
.prt-stat-card{background:#FDFAF6;border:1px solid rgba(107,29,29,.09);border-radius:14px;padding:24px 16px;text-align:center;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:8px;}
.prt-stat-num{font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:600;color:#1C1208;line-height:1;}
.prt-stat-label{font-family:'DM Sans',sans-serif;font-size:9px;font-weight:400;letter-spacing:.14em;text-transform:uppercase;color:#7A6555;}
.prt-visit-list{display:flex;flex-direction:column;}
.prt-visit-row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid rgba(107,29,29,.06);}
.prt-visit-row:last-child{border-bottom:none;}
.prt-visit-name{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:400;color:#1C1208;}
.prt-visit-date{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:300;color:#7A6555;margin-top:2px;}
.prt-scanned{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:500;color:#2D6A4F;}
.prt-not-scanned{font-family:'DM Sans',sans-serif;font-size:11px;color:rgba(122,101,85,.42);}
.prt-logout-area{text-align:center;padding:64px 20px;}
.prt-logout-title{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:600;color:#1C1208;margin-bottom:12px;}
.prt-logout-desc{font-family:'DM Sans',sans-serif;font-size:14px;font-weight:300;color:#7A6555;line-height:1.7;margin-bottom:28px;}
.prt-loading{font-family:'DM Sans',sans-serif;font-size:13px;color:#7A6555;padding:32px 0;text-align:center;}
.prt-empty{font-family:'DM Sans',sans-serif;font-size:13px;color:rgba(122,101,85,.5);padding:24px 0;text-align:center;}
@media(max-width:640px){.prt-content{padding:20px 16px;}.prt-header{padding:14px 16px;}.prt-tabs-bar{padding:0 12px;}.prt-stats-grid{grid-template-columns:repeat(2,1fr);gap:6px;}.prt-stat-num{font-size:26px;}.prt-menu-item-actions{flex-direction:row;}.prt-login{padding:36px 28px;}}
.prt-hours-grid{display:flex;flex-direction:column;gap:8px;margin-bottom:4px;}
.prt-hours-row{background:white;border:1px solid rgba(107,29,29,.12);border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.prt-hours-day-name{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:400;color:#1C1208;min-width:86px;}
.prt-hours-toggle{display:flex;gap:0;background:rgba(107,29,29,.06);border-radius:8px;padding:2px;flex-shrink:0;}
.prt-hours-toggle-btn{font-family:'DM Sans',sans-serif;font-size:11px;padding:5px 11px;border-radius:6px;border:none;cursor:pointer;background:transparent;color:rgba(122,101,85,.55);transition:all .18s;}
.prt-hours-toggle-btn.on{background:#1C1208;color:#F7F3EE;}
.prt-hours-slot-input{flex:1;min-width:180px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:#1C1208;background:#F9F5EF;border:1px solid rgba(107,29,29,.1);border-radius:6px;padding:7px 10px;outline:none;transition:border-color .2s;}
.prt-hours-slot-input:focus{border-color:#6B1D1D;background:white;}
.prt-hours-slot-input::placeholder{color:rgba(122,101,85,.35);}
.prt-hours-slot-input:disabled{opacity:.35;cursor:not-allowed;}
.prt-hours-slots{display:flex;flex-direction:column;gap:7px;flex:1;}
.prt-hours-slot-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap;}
.prt-hours-time{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:#1C1208;background:#F9F5EF;border:1px solid rgba(107,29,29,.1);border-radius:6px;padding:6px 8px;outline:none;transition:border-color .2s;width:96px;}
.prt-hours-time:focus{border-color:#6B1D1D;background:white;}
.prt-hours-time-sep{font-family:'DM Sans',sans-serif;font-size:12px;color:rgba(122,101,85,.45);}
.prt-hours-slot-add{font-family:'DM Sans',sans-serif;font-size:11px;color:#6B1D1D;background:none;border:1px solid rgba(107,29,29,.2);border-radius:6px;padding:5px 9px;cursor:pointer;transition:all .18s;white-space:nowrap;}
.prt-hours-slot-add:hover{background:rgba(107,29,29,.05);}
.prt-hours-slot-rm{font-family:'DM Sans',sans-serif;font-size:16px;line-height:1;color:rgba(122,101,85,.38);background:none;border:none;cursor:pointer;padding:0 2px;transition:color .18s;}
.prt-hours-slot-rm:hover{color:#9B2335;}
.txn-mode-bar{display:flex;gap:0;background:rgba(107,29,29,.06);border-radius:8px;padding:2px;width:fit-content;margin-bottom:4px;}
.txn-mode-btn{font-family:'DM Sans',sans-serif;font-size:12px;padding:8px 16px;border-radius:6px;border:none;cursor:pointer;background:transparent;color:rgba(122,101,85,.55);transition:all .18s;white-space:nowrap;}
.txn-mode-btn.on{background:#1C1208;color:#F7F3EE;}
.txn-card{background:#FDFAF6;border:1px solid rgba(107,29,29,.09);border-radius:16px;padding:22px;display:flex;flex-direction:column;gap:16px;}
.txn-qr-wrap{border-radius:12px;overflow:hidden;border:1px solid rgba(107,29,29,.1);background:#1C1208;}
.txn-client-chip{display:flex;align-items:flex-start;gap:12px;background:rgba(45,106,79,.07);border:1px solid rgba(45,106,79,.18);border-radius:12px;padding:14px 16px;}
.txn-client-check{width:28px;height:28px;border-radius:50%;background:rgba(45,106,79,.12);border:1px solid rgba(45,106,79,.25);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;}
.txn-client-name{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;color:#1C1208;line-height:1;margin-bottom:3px;}
.txn-client-sub{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:300;color:#7A6555;}
.txn-calc-box{background:rgba(107,29,29,.03);border:1px solid rgba(107,29,29,.1);border-radius:12px;padding:16px 18px;display:flex;flex-direction:column;gap:9px;}
.txn-calc-row{display:flex;justify-content:space-between;align-items:baseline;gap:8px;}
.txn-calc-label{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:300;color:#7A6555;flex-shrink:0;}
.txn-calc-val{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#1C1208;}
.txn-calc-row.hilite .txn-calc-val{color:#6B1D1D;}
.txn-calc-row.due .txn-calc-val{color:#9B2335;}
.txn-calc-divider{height:1px;background:rgba(107,29,29,.08);}
.txn-success-icon{width:52px;height:52px;border-radius:50%;background:rgba(45,106,79,.1);border:1px solid rgba(45,106,79,.22);display:flex;align-items:center;justify-content:center;margin:0 auto 10px;}
.gpp-hero{background:#1C1208;min-height:50vh;position:relative;overflow:hidden;display:flex;align-items:flex-end;padding:120px 52px 52px;}
.gpp-hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.gpp-hero-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(28,18,8,.2) 0%,rgba(28,18,8,.78) 100%);}
.gpp-hero-content{position:relative;z-index:1;}
.gpp-hero-cat{font-family:'DM Sans',sans-serif;font-size:10px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:rgba(247,243,238,.5);margin-bottom:10px;}
.gpp-hero-name{font-family:'Cormorant Garamond',serif;font-size:clamp(42px,6vw,68px);font-weight:700;color:#F7F3EE;line-height:.95;margin-bottom:14px;}
.gpp-hero-desc{font-family:'DM Sans',sans-serif;font-size:14px;font-weight:300;color:rgba(247,243,238,.6);max-width:440px;line-height:1.65;}
.gpp-body{background:#F7F3EE;padding:52px;}
.gpp-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:44px;}
.gpp-info-card{background:#FDFAF6;border:1px solid rgba(107,29,29,.09);border-radius:14px;padding:20px 18px;}
.gpp-info-label{font-family:'DM Sans',sans-serif;font-size:9px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:#6B1D1D;margin-bottom:7px;}
.gpp-info-val{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:#1C1208;line-height:1.55;}
.gpp-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(107,29,29,.06);border:1px solid rgba(107,29,29,.13);border-radius:100px;padding:8px 16px;margin-top:6px;}
.gpp-badge-txt{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:400;color:#6B1D1D;}
.gpp-section{margin-bottom:52px;}
.gpp-section-title{font-family:'Cormorant Garamond',serif;font-size:clamp(28px,4vw,40px);font-weight:600;color:#1C1208;margin-bottom:28px;line-height:1.05;}
.gpp-section-title em{font-style:italic;color:#6B1D1D;}
.gpp-hours-list{border:1px solid rgba(107,29,29,.08);border-radius:12px;overflow:hidden;}
.gpp-hours-line{display:flex;align-items:baseline;justify-content:space-between;gap:16px;padding:11px 18px;border-bottom:1px solid rgba(107,29,29,.06);background:#FDFAF6;transition:background .15s;}
.gpp-hours-line:last-child{border-bottom:none;}
.gpp-hours-line.today{background:#FAF4EC;}
.gpp-hl-day{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:400;color:#1C1208;flex-shrink:0;}
.gpp-hours-line.today .gpp-hl-day{font-weight:600;color:#6B1D1D;}
.gpp-hl-slots{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:#3D2B1F;text-align:right;}
.gpp-hours-line.today .gpp-hl-slots{font-weight:400;color:#6B1D1D;}
.gpp-hl-closed{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:rgba(122,101,85,.32);text-align:right;}
.gpp-menu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px;}
.gpp-item{background:#FDFAF6;border:1px solid rgba(107,29,29,.09);border-radius:14px;overflow:hidden;transition:all .25s;}
.gpp-item:hover{border-color:rgba(107,29,29,.18);box-shadow:0 8px 28px rgba(28,18,8,.07);}
.gpp-item-img{height:160px;overflow:hidden;background:#1C1208;}
.gpp-item-img img{width:100%;height:100%;object-fit:cover;transition:transform .4s;}
.gpp-item:hover .gpp-item-img img{transform:scale(1.04);}
.gpp-no-photo{height:160px;background:rgba(107,29,29,.04);display:flex;align-items:center;justify-content:center;font-family:'DM Sans',sans-serif;font-size:11px;color:rgba(122,101,85,.3);}
.gpp-item-body{padding:16px 18px;}
.gpp-item-name{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:#1C1208;margin-bottom:4px;}
.gpp-item-desc{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:300;color:#7A6555;line-height:1.55;margin-bottom:12px;}
.gpp-item-foot{display:flex;align-items:center;justify-content:space-between;}
.gpp-item-price{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:#6B1D1D;}
.gpp-cart-btn{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;background:#1C1208;color:#F7F3EE;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;transition:background .2s;}
.gpp-cart-btn:hover{background:#6B1D1D;}.gpp-cart-btn.added{background:#2D6A4F;}
.gpp-cart-bar{position:fixed;bottom:0;left:0;right:0;background:#1C1208;padding:16px 28px;display:flex;align-items:center;justify-content:space-between;z-index:100;transform:translateY(105%);transition:transform .35s cubic-bezier(.16,1,.3,1);}
.gpp-cart-bar.vis{transform:translateY(0);}
.gpp-cart-count{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:300;color:rgba(247,243,238,.45);margin-bottom:2px;}
.gpp-cart-total{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#F7F3EE;}
.gpp-cart-cta{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;background:#6B1D1D;color:#F7F3EE;border:none;border-radius:8px;padding:12px 22px;cursor:pointer;transition:background .2s;}
.gpp-cart-cta:hover{background:#8B2929;}
.gpp-no-hours{display:flex;align-items:center;gap:10px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:rgba(122,101,85,.6);background:#FDFAF6;border:1px solid rgba(107,29,29,.07);border-radius:12px;padding:18px 20px;}
.gpp-status-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(247,243,238,.14);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-radius:100px;padding:5px 12px;font-family:'DM Sans',sans-serif;font-size:11px;margin-top:12px;border:1px solid rgba(247,243,238,.12);}
.gpp-status-badge.open{color:#7FD4A0;}.gpp-status-badge.soon{color:#FFB74D;}.gpp-status-badge.closed{color:#F09090;}
.gpp-sdot{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
.gpp-sdot.open{background:#7FD4A0;animation:ripple 2.2s infinite;}.gpp-sdot.soon{background:#FFB74D;}.gpp-sdot.closed{background:#F09090;}
.gpp-status-badge-sm{display:inline-flex;align-items:center;gap:5px;border-radius:100px;padding:3px 9px;font-family:'DM Sans',sans-serif;font-size:10px;letter-spacing:.03em;flex-shrink:0;}
.gpp-status-badge-sm.open{background:rgba(45,106,79,.1);color:#2D6A4F;}
.gpp-status-badge-sm.soon{background:rgba(180,83,9,.1);color:#B45309;}
.gpp-status-badge-sm.closed{background:rgba(155,35,53,.09);color:#9B2335;}
@media(max-width:640px){.gpp-hero{padding:90px 20px 40px;min-height:40vh;}.gpp-body{padding:28px 16px;}.gpp-info-grid{grid-template-columns:1fr;}.gpp-section-title{font-size:28px;}}
.lgn-wrap{min-height:100dvh;background:#1C1208;display:flex;flex-direction:column;align-items:center;padding:40px 20px;}.lgn-logo{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:700;color:#F7F3EE;letter-spacing:-.01em;cursor:pointer;margin-bottom:48px;}.lgn-logo em{font-style:italic;color:rgba(247,243,238,.5);}.lgn-card{background:rgba(247,243,238,.05);border:1px solid rgba(247,243,238,.1);border-radius:20px;padding:36px;width:100%;max-width:440px;}.lgn-title{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:600;color:#F7F3EE;margin-bottom:8px;}.lgn-sub{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:rgba(247,243,238,.5);margin-bottom:28px;line-height:1.6;}.lgn-divider{border:none;border-top:1px solid rgba(247,243,238,.08);margin:28px 0;}.lgn-section-label{font-family:'DM Sans',sans-serif;font-size:9px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:#6B1D1D;margin-bottom:14px;}.lgn-input{width:100%;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:300;color:#F7F3EE;background:rgba(247,243,238,.07);border:1px solid rgba(247,243,238,.12);border-radius:10px;padding:13px 16px;outline:none;transition:border-color .2s;margin-bottom:12px;display:block;box-sizing:border-box;}.lgn-input:focus{border-color:rgba(247,243,238,.3);}.lgn-input::placeholder{color:rgba(247,243,238,.25);}.lgn-select{width:100%;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:300;color:#F7F3EE;background:rgba(247,243,238,.1);border:1px solid rgba(247,243,238,.12);border-radius:10px;padding:13px 16px;outline:none;cursor:pointer;appearance:none;-webkit-appearance:none;margin-bottom:12px;display:block;box-sizing:border-box;}.lgn-select option{background:#2A1A0E;color:#F7F3EE;}.lgn-textarea{width:100%;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:300;color:#F7F3EE;background:rgba(247,243,238,.07);border:1px solid rgba(247,243,238,.12);border-radius:10px;padding:13px 16px;outline:none;resize:vertical;min-height:88px;margin-bottom:12px;display:block;transition:border-color .2s;box-sizing:border-box;}.lgn-textarea:focus{border-color:rgba(247,243,238,.3);}.lgn-textarea::placeholder{color:rgba(247,243,238,.25);}.lgn-btn{width:100%;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;background:#6B1D1D;color:#F7F3EE;border:none;border-radius:10px;padding:14px;cursor:pointer;transition:all .2s;margin-top:4px;}.lgn-btn:hover{background:#8B2929;}.lgn-btn:disabled{opacity:.5;cursor:not-allowed;}.lgn-err{font-family:'DM Sans',sans-serif;font-size:12px;color:#F09090;margin-bottom:12px;}.lgn-choice-btn{width:100%;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:400;background:transparent;color:rgba(247,243,238,.7);border:1px solid rgba(247,243,238,.12);border-radius:10px;padding:14px 18px;cursor:pointer;transition:all .2s;text-align:left;display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;box-sizing:border-box;}.lgn-choice-btn:last-child{margin-bottom:0;}.lgn-choice-btn:hover{border-color:rgba(247,243,238,.28);color:#F7F3EE;background:rgba(247,243,238,.04);}.lgn-back{font-family:'DM Sans',sans-serif;font-size:12px;color:rgba(247,243,238,.35);background:none;border:none;cursor:pointer;padding:0;margin-bottom:20px;transition:color .2s;display:block;}.lgn-back:hover{color:rgba(247,243,238,.6);}.lgn-success{text-align:center;padding:12px 0;}.lgn-success-icon{width:48px;height:48px;border-radius:50%;background:rgba(45,106,79,.15);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;}.lgn-success-title{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:600;color:#F7F3EE;margin-bottom:8px;}.lgn-success-desc{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:rgba(247,243,238,.55);line-height:1.7;}.lgn-field-label{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:400;color:rgba(247,243,238,.4);margin-bottom:6px;letter-spacing:.04em;}.lgn-input-group{position:relative;display:flex;align-items:center;margin-bottom:12px;}.lgn-input-group .lgn-input{margin-bottom:0;padding-right:40px;}.lgn-input-suffix{position:absolute;right:14px;font-family:'DM Sans',sans-serif;font-size:14px;color:rgba(247,243,238,.4);}
.htl-wrap{min-height:100dvh;background:#F7F3EE;}.htl-header{background:#1C1208;padding:20px 28px;display:flex;align-items:center;justify-content:space-between;}.htl-logo{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:#F7F3EE;}.htl-logo em{font-style:italic;color:rgba(247,243,238,.45);}.htl-logout{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:400;color:rgba(247,243,238,.4);background:none;border:none;cursor:pointer;letter-spacing:.04em;transition:color .2s;}.htl-logout:hover{color:rgba(247,243,238,.7);}.htl-content{padding:48px 28px;max-width:800px;margin:0 auto;}.htl-name{font-family:'Cormorant Garamond',serif;font-size:clamp(32px,5vw,52px);font-weight:600;color:#1C1208;margin-bottom:6px;line-height:1.05;}.htl-type{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:300;color:#7A6555;letter-spacing:.08em;text-transform:uppercase;margin-bottom:36px;}.htl-stats-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:32px;}.htl-stat-card{background:#FDFAF6;border:1px solid rgba(107,29,29,.09);border-radius:16px;padding:24px 20px;}.htl-stat-label{font-family:'DM Sans',sans-serif;font-size:9px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:#6B1D1D;margin-bottom:10px;}.htl-stat-num{font-family:'Cormorant Garamond',serif;font-size:42px;font-weight:600;color:#1C1208;line-height:1;margin-bottom:4px;}.htl-stat-desc{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:300;color:#7A6555;}.htl-coming{background:#FDFAF6;border:1px solid rgba(107,29,29,.09);border-radius:16px;padding:28px 24px;text-align:center;}.htl-coming-title{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#1C1208;margin-bottom:8px;}.htl-coming-desc{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:#7A6555;line-height:1.65;}
@media(max-width:640px){.lgn-card{padding:28px 20px;}.htl-content{padding:32px 16px;}.htl-stats-grid{grid-template-columns:1fr;}}
.auth-overlay{position:fixed;inset:0;background:rgba(28,18,8,.52);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(3px);}
.auth-card{background:#FDFAF6;border:1px solid rgba(107,29,29,.1);border-radius:20px;padding:36px;width:100%;max-width:420px;position:relative;max-height:92dvh;overflow-y:auto;}
.auth-close{position:absolute;top:14px;right:16px;background:none;border:none;cursor:pointer;font-size:22px;color:rgba(122,101,85,.4);line-height:1;padding:4px 6px;transition:color .2s;}
.auth-close:hover{color:#6B1D1D;}
.auth-title{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:600;color:#1C1208;margin-bottom:6px;}
.auth-sub{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:#7A6555;margin-bottom:22px;line-height:1.6;}
.auth-tabs{display:flex;border-bottom:1px solid rgba(107,29,29,.1);margin-bottom:22px;}
.auth-tab{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:400;color:rgba(122,101,85,.55);background:none;border:none;border-bottom:2px solid transparent;padding:8px 16px 10px;cursor:pointer;transition:all .2s;margin-bottom:-1px;}
.auth-tab.active{color:#6B1D1D;border-bottom-color:#6B1D1D;font-weight:500;}
.auth-label{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:400;color:rgba(122,101,85,.7);margin-bottom:5px;display:block;letter-spacing:.03em;}
.auth-input{width:100%;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:300;color:#1C1208;background:#fff;border:1px solid rgba(107,29,29,.15);border-radius:10px;padding:12px 14px;outline:none;transition:border-color .2s;margin-bottom:14px;display:block;box-sizing:border-box;}
.auth-input:focus{border-color:rgba(107,29,29,.4);}
.auth-input::placeholder{color:rgba(122,101,85,.38);}
.auth-btn{width:100%;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;background:#1C1208;color:#F7F3EE;border:none;border-radius:10px;padding:14px;cursor:pointer;transition:background .2s;margin-top:6px;}
.auth-btn:hover:not(:disabled){background:#2A1A0E;}
.auth-btn:disabled{opacity:.45;cursor:not-allowed;}
.auth-err{font-family:'DM Sans',sans-serif;font-size:12px;color:#9B2335;margin-bottom:14px;padding:10px 12px;background:rgba(155,35,53,.07);border-radius:8px;line-height:1.5;}
.auth-ok{font-family:'DM Sans',sans-serif;font-size:12px;color:#2D6A4F;margin-bottom:14px;padding:10px 12px;background:rgba(45,106,79,.07);border-radius:8px;line-height:1.5;}
.auth-rgpd{display:flex;gap:10px;align-items:flex-start;margin-bottom:16px;}
.auth-rgpd-check{width:15px;height:15px;flex-shrink:0;margin-top:3px;accent-color:#6B1D1D;cursor:pointer;}
.auth-rgpd-text{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:300;color:#7A6555;line-height:1.65;}
.auth-rgpd-link{color:#6B1D1D;text-decoration:underline;text-decoration-color:rgba(107,29,29,.3);cursor:pointer;background:none;border:none;font-size:12px;font-family:'DM Sans',sans-serif;font-weight:300;padding:0;}
.auth-switch{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:300;color:rgba(122,101,85,.55);text-align:center;margin-top:18px;}
.auth-switch-btn{color:#6B1D1D;background:none;border:none;cursor:pointer;font-size:12px;font-family:'DM Sans',sans-serif;font-weight:400;text-decoration:underline;text-decoration-color:rgba(107,29,29,.3);padding:0;}
.nav-auth-btn{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:400;color:rgba(28,18,8,.6);background:none;border:1px solid rgba(107,29,29,.2);border-radius:8px;padding:7px 14px;cursor:pointer;transition:all .2s;margin-left:8px;}
.nav-auth-btn:hover{background:rgba(107,29,29,.06);border-color:rgba(107,29,29,.35);color:#1C1208;}
.nav-auth-name{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;color:#6B1D1D;cursor:pointer;margin-left:8px;padding:6px 12px;border:1px solid rgba(107,29,29,.3);border-radius:20px;background:transparent;display:inline-flex;align-items:center;gap:5px;transition:all .2s;}
.nav-auth-name:hover{background:rgba(107,29,29,.06);border-color:#6B1D1D;}
`;

function HomePage({ onNavigate, supabasePartners }) {
  const [loaded,setLoaded]=useState(false);
  const [partnerCount,setPartnerCount]=useState(null);
  useEffect(()=>{setTimeout(()=>setLoaded(true),80);},[]);
  useEffect(()=>{
    supabase.from('candidates').select('*',{count:'exact',head:true}).eq('status','approuve').then(({count})=>setPartnerCount(count??0));
  },[]);
  const TICKER=["Bordeaux","Partenaires locaux","Prix négociés","Retrait rapide","100% local","Sans inscription"];

  const IconBrowse = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </svg>
  );
  const IconCart = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  );
  const IconCheck = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
  const IconArrow = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  );

  const CatIcons = {
    restauration: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
      </svg>
    ),
    sport: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    bienetre: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  };

  return (
    <>
      {/* ── HERO ───────────────────────────────────────── */}
      <section className="hero hero-photo">
        <div style={{position:"absolute",inset:0,backgroundImage:"url(https://images.unsplash.com/photo-1698608216843-67ae1151b2b8?q=80&w=1600&auto=format&fit=crop)",backgroundSize:"cover",backgroundPosition:"center 55%",pointerEvents:"none"}}/>
        <div style={{position:"absolute",inset:0,background:"rgba(28,18,8,.45)",pointerEvents:"none"}}/>

        <div style={{opacity:loaded?1:0,transform:loaded?"none":"translateY(14px)",transition:"opacity .7s ease .1s,transform .7s ease .1s",position:'relative',zIndex:1}}>
          <div className="hero-badge">
            <div className="badge-dot"/>
            <span className="badge-txt fb">Bordeaux · Partenaires locaux</span>
          </div>
        </div>

        <div style={{opacity:loaded?1:0,transform:loaded?"none":"translateY(28px)",transition:"opacity 1s ease .22s,transform 1s cubic-bezier(.16,1,.3,1) .22s",position:'relative',zIndex:1}}>
          <h1 className="hero-title fd">Le meilleur<br/>de <em>Bordeaux</em>,<br/>à portée de main.</h1>
        </div>

        <div className="hero-foot" style={{opacity:loaded?1:0,transition:"opacity 1s ease .48s",position:'relative',zIndex:1}}>
          <p className="hero-desc fb">Accédez aux meilleures adresses de Bordeaux et profitez de réductions exclusives chez nos partenaires locaux.</p>
          <div className="hero-actions">
            <button className="btn-primary fb" onClick={()=>document.getElementById("categories")?.scrollIntoView({behavior:"smooth"})}>
              Explorer les adresses <IconArrow/>
            </button>
            <span className="hero-note fb">Gratuit · Sans inscription · 100% local</span>
          </div>
        </div>
      </section>

      {/* ── TICKER ─────────────────────────────────────── */}
      <div className="ticker-wrap">
        <div className="ticker">
          {[...TICKER,...TICKER,...TICKER,...TICKER].map((t,i)=><div className="ticker-item fd" key={i}>{t}</div>)}
        </div>
      </div>

      {/* ── HOW IT WORKS ───────────────────────────────── */}
      <section className="section how-section" style={{background:"#F7F3EE"}}>
        <FadeUp>
          <div className="sec-tag fb">Simple &amp; rapide</div>
          <div className="sec-title fd">Comment ça <em>marche</em> ?</div>
        </FadeUp>
        <FadeUp delay={.1}>
          <div className="how-grid">
            {[
              ["01",IconBrowse,"Scannez le QR code","Votre hôtel dispose d'un QR code Locally dans votre chambre. Scannez-le pour accéder à nos partenaires."],
              ["02",IconCart,"Choisissez un partenaire","Parcourez les adresses sélectionnées et générez votre QR code personnel en un clic."],
              ["03",IconCheck,"Profitez de votre réduction","Présentez votre QR code à l'accueil du partenaire et bénéficiez immédiatement de votre réduction."],
            ].map(([n,Icon,t,d])=>(
              <div className="how-card" key={n}>
                <div className="how-icon"><Icon/></div>
                <div className="how-num fd">{n}</div>
                <div className="how-title fd">{t}</div>
                <div className="how-desc fb">{d}</div>
              </div>
            ))}
          </div>
          <div style={{textAlign:'center',marginTop:28}}>
            <button className="how-more-btn fb" onClick={()=>siteNav('/comment-ca-marche')}>En savoir plus →</button>
          </div>
        </FadeUp>
      </section>

      {/* ── DIVIDER ────────────────────────────────────── */}
      <div className="div-label">
        <div className="div-line"/>
        <span className="div-txt fd">Nos catégories</span>
        <div className="div-line"/>
      </div>

      {/* ── CATEGORIES ─────────────────────────────────── */}
      <section className="section" id="categories" style={{background:"#F7F3EE"}}>
        <FadeUp>
          <div className="sec-tag fb">À Bordeaux</div>
          <div className="sec-title fd">Que cherchez-<em>vous</em> ?</div>
        </FadeUp>
        <FadeUp delay={.1}>
          <div className="cat-grid">
            {(()=>{
              const photos={
                restauration:"https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80",
                boulangerie:"https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80",
                sport:"https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
                bienetre:"https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80",
                activite:"https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&q=80",
                autre:"https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&q=80",
              };
              const idToLabel=Object.fromEntries(Object.entries(CATEGORIE_MAP).map(([k,v])=>[v,k]));
              const activeCats=new Set((supabasePartners||[]).map(p=>p.categorie));
              const standardCats=new Set(Object.keys(CATEGORIE_MAP));
              const hasOther=(supabasePartners||[]).some(p=>!standardCats.has(p.categorie));
              const visibleCats=CATEGORIES.filter(cat=>
                cat.id==='autre'?hasOther:activeCats.has(idToLabel[cat.id])
              );
              if(visibleCats.length===0)return null;
              return visibleCats.map(cat=>(
                <div key={cat.id} className="catcard-photo active" onClick={()=>onNavigate("category",cat.id)}>
                  <img src={photos[cat.id]} className="catcard-photo-img" alt={cat.label} loading="lazy"/>
                  <div className="catcard-photo-overlay"/>
                  <div className="catcard-photo-content">
                    <div className="catcard-photo-name">{cat.label}</div>
                    <div className="catcard-photo-cta fb">Voir les adresses →</div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </FadeUp>
      </section>

      {/* ── FOOTER ─────────────────────────────────────── */}
      <SiteFooter/>
    </>
  );
}

const heroZoom = {
  initial: { scale: 1.06, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
};
const cardContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
};
const cardItem = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
};

const FILTER_CATS=['Tous','Restauration','Boulangerie','Bien-être','Activité','Sport','Autre'];
function CategoryPage({ categoryId, onBack, onNavigate, supabasePartners }) {
  const all=supabasePartners||[];
  const initCat=(()=>{
    if(!categoryId)return'Tous';
    const found=Object.keys(CATEGORIE_MAP).find(k=>CATEGORIE_MAP[k]===categoryId);
    return found||'Tous';
  })();
  const [selCat,setSelCat]=useState(initCat);
  const [selTags,setSelTags]=useState([]);

  const cats=FILTER_CATS;
  const byCat=selCat==='Tous'?all:all.filter(p=>p.categorie===selCat);
  const availTags=selCat!=='Tous'?(TAGS_PAR_CATEGORIE[selCat]||[]).filter(t=>byCat.some(p=>(p.tags||[]).includes(t))):[];
  const filtered=selTags.length===0?byCat:byCat.filter(p=>selTags.some(t=>(p.tags||[]).includes(t)));
  const total=filtered.length;

  const heroCat=selCat==='Tous'?null:CATEGORIES.find(c=>c.id===CATEGORIE_MAP[selCat]);

  function selectCat(c){setSelCat(c);setSelTags([]);}
  function toggleTag(t){setSelTags(ts=>ts.includes(t)?ts.filter(x=>x!==t):[...ts,t]);}

  const pillBase={whiteSpace:'nowrap',borderRadius:999,fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:500,cursor:'pointer',transition:'all .15s',border:'1px solid'};

  return (
    <>
      <motion.div className="catpage-hero" variants={heroZoom} initial="initial" animate="animate">
        <button className="catpage-back fb" onClick={onBack}>← Retour</button>
        {heroCat?<span className="catpage-icon">{heroCat.icon}</span>:<span className="catpage-icon">🏪</span>}
        <div className="catpage-title fd">{heroCat?heroCat.label:'Nos partenaires'}<br/><em>à Bordeaux</em></div>
        <div className="catpage-sub fb">{total} adresse{total>1?'s':''} disponible{total>1?'s':''}</div>
      </motion.div>
      <div style={{background:'#F7F3EE',padding:'48px 24px 64px'}}>
        {/* Filtre catégories */}
        <div style={{overflowX:'auto',display:'flex',gap:8,marginBottom:12,paddingBottom:4,WebkitOverflowScrolling:'touch'}}>
          {cats.map(c=>{
            const active=selCat===c;
            return(
              <button key={c} onClick={()=>selectCat(c)} style={{...pillBase,padding:'7px 16px',background:active?'#6B1D1D':'transparent',borderColor:active?'#6B1D1D':'rgba(28,18,8,.18)',color:active?'#F7F3EE':'#7A6555'}}>
                {c}
              </button>
            );
          })}
        </div>
        {/* Sous-filtre tags */}
        {availTags.length>0&&(
          <div style={{overflowX:'auto',display:'flex',gap:6,marginBottom:28,paddingBottom:4,WebkitOverflowScrolling:'touch'}}>
            {availTags.map(t=>{
              const active=selTags.includes(t);
              return(
                <button key={t} onClick={()=>toggleTag(t)} style={{...pillBase,padding:'4px 12px',fontSize:12,background:active?'rgba(107,29,29,.12)':'transparent',borderColor:active?'#6B1D1D':'rgba(28,18,8,.12)',color:active?'#6B1D1D':'#9B8B7A'}}>
                  {t}
                </button>
              );
            })}
          </div>
        )}
        {/* Grille */}
        {filtered.length===0?(
          <div style={{textAlign:'center',padding:'48px 0',fontFamily:"'DM Sans',sans-serif",fontSize:14,color:'#9B8B7A'}}>Aucun partenaire pour ces filtres.</div>
        ):(
          <motion.div className="partners-grid" variants={cardContainer} initial="initial" animate="animate">
            {filtered.map(p=>(
              <motion.div key={p.id} className="pcard" variants={cardItem} onClick={()=>onNavigate('generic',p)}>
                <div className="pcard-img" style={{background:'#1C1208'}}>
                  {p.photo_url?<img src={p.photo_url} alt={p.nom} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:null}
                  {(()=>{const st=getOpenStatus(p.horaires);if(!st)return null;const lbl=st==='open'?'Ouvert':st==='soon'?'Ferme bientôt':'Fermé';return(<div className={'pcard-status '+st}><div className={'sdot '+st}/><span className="fb">{lbl}</span></div>);})()}
                </div>
                <div className="pcard-body">
                  <div className="pcard-cat fb">{p.categorie}</div>
                  <div className="pcard-name fd">{p.nom}</div>
                  <div className="pcard-desc fb">{p.description||p.google_maps}</div>
                  {(p.tags||[]).length>0&&(
                    <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:8}}>
                      {(p.tags||[]).slice(0,3).map(t=>(
                        <span key={t} style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:500,color:'#6B1D1D',background:'rgba(107,29,29,.08)',borderRadius:999,padding:'2px 8px'}}>{t}</span>
                      ))}
                    </div>
                  )}
                  <div className="pcard-foot">
                    <span className="pcard-cta fb">Voir le commerce</span>
                    <div className="pcard-icon">→</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
      <SiteFooter/>
    </>
  );
}

function renderMarkdown(text) {
  if (!text) return "";
  function esc(s) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function inline(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
      .replace(/\*(.+?)\*/g,"<em>$1</em>");
  }
  const lines = text.split("\n");
  let html = "";
  let inTable = false;
  let tableFirstRow = true;
  let inList = false;
  for (const line of lines) {
    const t = line.trim();
    if (/^\|.+\|$/.test(t)) {
      if (/^\|[\s\-:|]+\|$/.test(t)) { tableFirstRow = false; continue; }
      if (!inTable) {
        if (inList) { html += "</ul>"; inList = false; }
        html += `<table style="width:100%;border-collapse:collapse;margin:12px 0;">`;
        inTable = true; tableFirstRow = true;
      }
      const cells = t.slice(1,-1).split("|").map(c=>c.trim());
      if (tableFirstRow) {
        html += `<thead><tr>${cells.map(c=>`<th style="padding:6px 10px;border:1px solid rgba(107,29,29,.4);background:rgba(107,29,29,.25);color:#F7F3EE;text-align:left;font-size:12px;">${inline(c)}</th>`).join("")}</tr></thead><tbody>`;
        tableFirstRow = false;
      } else {
        html += `<tr>${cells.map(c=>`<td style="padding:6px 10px;border:1px solid rgba(247,243,238,.1);color:rgba(247,243,238,.85);font-size:12px;">${inline(c)}</td>`).join("")}</tr>`;
      }
      continue;
    }
    if (inTable) { html += "</tbody></table>"; inTable = false; }
    if (/^[-*]\s/.test(t)) {
      if (!inList) { html += `<ul style="margin:8px 0 8px 18px;padding:0;">`; inList = true; }
      html += `<li style="font-family:'DM Sans',sans-serif;font-size:13px;color:#F7F3EE;line-height:1.7;margin:2px 0;">${inline(t.slice(2))}</li>`;
      continue;
    }
    if (inList) { html += "</ul>"; inList = false; }
    if (/^---+$/.test(t)) { html += `<hr style="border:none;border-top:1px solid rgba(107,29,29,.2);margin:16px 0;"/>`; continue; }
    if (t.startsWith("## ")) { html += `<h2 style="font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:700;color:#F7F3EE;margin-top:20px;margin-bottom:6px;">${inline(t.slice(3))}</h2>`; continue; }
    if (t.startsWith("### ")) { html += `<h3 style="font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;color:rgba(247,243,238,.8);margin-top:14px;margin-bottom:4px;">${inline(t.slice(4))}</h3>`; continue; }
    if (t.startsWith("> ")) { html += `<blockquote style="border-left:3px solid #6B1D1D;margin:10px 0;padding:6px 14px;color:rgba(247,243,238,.75);font-style:italic;font-size:13px;">${inline(t.slice(2))}</blockquote>`; continue; }
    if (!t) { html += `<div style="height:6px;"></div>`; continue; }
    html += `<p style="font-family:'DM Sans',sans-serif;font-size:13px;line-height:1.7;color:#F7F3EE;margin:2px 0;">${inline(t)}</p>`;
  }
  if (inTable) html += "</tbody></table>";
  if (inList) html += "</ul>";
  return html;
}

const DASH_PASSWORD = import.meta.env.VITE_DASHBOARD_PASSWORD;

function DashboardPage() {
  const [auth, setAuth] = useState(false);
  const [input, setInput] = useState("");
  const [tab, setTab] = useState("commandes");

  // Commandes
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Analyses
  const [analyses, setAnalyses] = useState([]);
  const [loadingAnalyses, setLoadingAnalyses] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [freshAnalysis, setFreshAnalysis] = useState(null);

  async function fetchOrders() {
    setLoadingOrders(true);
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (error) console.error("Supabase error:", error);
    setOrders(data || []);
    setLoadingOrders(false);
  }

  async function fetchAnalyses() {
    setLoadingAnalyses(true);
    const { data, error } = await supabase.from("analyses").select("*").order("created_at", { ascending: false });
    if (error) console.error("Supabase analyses error:", error);
    setAnalyses(data || []);
    setLoadingAnalyses(false);
  }

  async function generateAnalysis() {
    setGenerating(true);
    setFreshAnalysis(null);
    try {
      const { data: lastData } = await supabase.from("analyses").select("*").order("created_at", { ascending: false }).limit(1);
      const lastAnalysis = lastData?.[0] || null;

      let query = supabase.from("orders").select("*").order("created_at", { ascending: true });
      if (lastAnalysis?.date_to) query = query.gt("created_at", lastAnalysis.date_to);
      const { data: newOrders } = await query;
      const ordersToAnalyze = newOrders || [];

      const dateFrom = ordersToAnalyze[0]?.created_at || new Date().toISOString();
      const dateTo = ordersToAnalyze[ordersToAnalyze.length - 1]?.created_at || new Date().toISOString();

      const userPrompt = `Voici le contexte: ${lastAnalysis ? lastAnalysis.content : "Première analyse"}. Nouvelles commandes depuis la dernière analyse (${ordersToAnalyze.length} commandes): ${JSON.stringify(ordersToAnalyze)}. Génère une analyse business complète incluant: CA généré, articles les plus commandés, heures de pointe, tendances, comparaison avec période précédente si disponible, et 3 recommandations concrètes.`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          system: "Tu es un assistant business expert pour Locally, plateforme de commande locale à Bordeaux. Tu analyses les données de commandes et produis des rapports business concis et actionnables en français.",
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      const json = await res.json();
      const content = json.content?.[0]?.text || "";

      const { error: insertError } = await supabase.from("analyses").insert({
        content,
        orders_count: ordersToAnalyze.length,
        date_from: dateFrom,
        date_to: dateTo,
      });
      if (insertError) console.error("Supabase insert error:", insertError);

      setFreshAnalysis(content);
      await fetchAnalyses();
    } catch (err) {
      console.error("Generate analysis error:", err);
    }
    setGenerating(false);
  }

  function handleLogin(e) {
    e.preventDefault();
    if (!DASH_PASSWORD) { alert("Configuration manquante. Accès impossible."); return; }
    if (input === DASH_PASSWORD) { setAuth(true); fetchOrders(); fetchAnalyses(); }
    else alert("Mot de passe incorrect");
  }

  if (!auth) return (
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",minHeight:"80vh"}}>
      <form onSubmit={handleLogin} style={{background:"#fff",padding:40,borderRadius:12,boxShadow:"0 4px 24px rgba(0,0,0,.08)",display:"flex",flexDirection:"column",gap:16,minWidth:300}}>
        <div className="fd" style={{fontSize:22,marginBottom:4}}>Dashboard</div>
        <input className="input fb" type="password" placeholder="Mot de passe" value={input} onChange={e=>setInput(e.target.value)} autoFocus/>
        <button className="btn-primary fb" type="submit">Accéder →</button>
      </form>
    </div>
  );

  return (
    <div style={{padding:"100px 24px 64px",maxWidth:1100,margin:"0 auto"}}>
      <div className="fd" style={{fontSize:28,marginBottom:28}}>Dashboard <em>Locally</em></div>

      <div className="tabs" style={{marginBottom:32}}>
        <button className={"tab fb "+(tab==="commandes"?"active":"")} onClick={()=>setTab("commandes")}>Commandes</button>
        <button className={"tab fb "+(tab==="analyse"?"active":"")} onClick={()=>setTab("analyse")}>Analyse IA</button>
      </div>

      {tab==="commandes" && (
        <>
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:20}}>
            <button className="add-btn fb" onClick={fetchOrders}>{loadingOrders?"…":"↻ Actualiser"}</button>
          </div>
          {orders.length===0 && !loadingOrders && (
            <div className="fb" style={{color:"#999",textAlign:"center",marginTop:64}}>Aucune commande pour l'instant.</div>
          )}
          {orders.map(o=>(
            <div key={o.id} style={{background:"#fff",borderRadius:10,padding:"18px 24px",marginBottom:14,boxShadow:"0 2px 12px rgba(0,0,0,.06)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                <div>
                  <div className="fd" style={{fontSize:16}}>{o.client_name} <span style={{color:"#999",fontWeight:400,fontSize:13}}>· {o.client_phone}</span></div>
                  <div className="fb" style={{fontSize:13,color:"#6B1D1D",marginTop:2}}>{o.formula_name}</div>
                  {o.notes&&<div className="fb" style={{fontSize:12,color:"#888",marginTop:2}}>Note : {o.notes}</div>}
                </div>
                <div style={{textAlign:"right"}}>
                  <div className="fd" style={{fontSize:18}}>{Number(o.client_price).toFixed(2)} €</div>
                  <div className="fb" style={{fontSize:12,color:"#888",marginTop:2}}>Retrait {o.pickup_time}</div>
                  <div className="fb" style={{fontSize:11,color:"#bbb",marginTop:1}}>{new Date(o.created_at).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {tab==="analyse" && (
        <div style={{display:"flex",flexWrap:"wrap",gap:32,alignItems:"flex-start"}}>

          {/* History */}
          <div style={{flex:"1 1 300px"}}>
            <div className="fd" style={{fontSize:18,marginBottom:16,color:"#1C1208"}}>Historique</div>
            {loadingAnalyses&&<div className="fb" style={{color:"#999"}}>Chargement…</div>}
            {!loadingAnalyses&&analyses.length===0&&(
              <div className="fb" style={{color:"#999",fontSize:14}}>Aucune analyse pour l'instant.</div>
            )}
            {analyses.map(a=>(
              <div key={a.id}
                style={{background:"#1C1208",borderRadius:10,padding:"18px 20px",marginBottom:14,cursor:"pointer",transition:"opacity .15s"}}
                onClick={()=>setExpandedId(expandedId===a.id?null:a.id)}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div className="fb" style={{fontSize:12,color:"rgba(247,243,238,.5)"}}>
                    {new Date(a.created_at).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}
                  </div>
                  <div className="fb" style={{fontSize:11,color:"#6B1D1D",background:"rgba(107,29,29,.15)",padding:"2px 8px",borderRadius:20}}>
                    {a.orders_count} commande{a.orders_count!==1?"s":""}
                  </div>
                </div>
                {expandedId===a.id
                  ? <div dangerouslySetInnerHTML={{__html:renderMarkdown(a.content)}}/>
                  : <div className="fb" style={{fontSize:13,color:"rgba(247,243,238,.7)",lineHeight:1.6}}>{(a.content||"").slice(0,150)+(a.content?.length>150?"…":"")}</div>
                }
                <div className="fb" style={{fontSize:11,color:"rgba(247,243,238,.4)",marginTop:8,textAlign:"right"}}>
                  {expandedId===a.id?"▲ Réduire":"▼ Lire tout"}
                </div>
              </div>
            ))}
          </div>

          {/* Generate */}
          <div style={{flex:"1 1 300px"}}>
            <div className="fd" style={{fontSize:18,marginBottom:16,color:"#1C1208"}}>Nouvelle analyse</div>
            <button
              className="btn-call fb"
              onClick={generateAnalysis}
              disabled={generating}
              style={{width:"100%",marginBottom:20,opacity:generating?.6:1}}>
              {generating?"⏳ Génération en cours…":"✦ Générer l'analyse"}
            </button>
            {freshAnalysis&&(
              <div style={{background:"#1C1208",borderRadius:10,padding:"20px 22px"}}>
                <div className="fb" style={{fontSize:12,color:"rgba(247,243,238,.5)",marginBottom:10}}>Analyse générée maintenant</div>
                <div dangerouslySetInnerHTML={{__html:renderMarkdown(freshAnalysis)}}/>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}


let ADMIN_PWD="locally2024";
const STATUS_BADGES={
  pending:   {label:'Pending',    bg:'rgba(217,119,6,.15)',  color:'#D97706'},
  en_attente:{label:'En attente', bg:'rgba(59,130,246,.15)', color:'#3B82F6'},
  approuve:  {label:'Approuvé',   bg:'rgba(16,185,129,.15)', color:'#10B981'},
  rejete:    {label:'Rejeté',     bg:'rgba(239,68,68,.15)',  color:'#EF4444'},
};
function LoginView({onLogin}){
  const [view,setView]=useState('home');
  const [code,setCode]=useState('');
  const [err,setErr]=useState('');
  const [loading,setLoading]=useState(false);
  const [cForm,setCForm]=useState({nom:'',categorie:'',categorie_autre:'',google_maps:'',telephone:'',description:'',reduction:'',email:''});
  const [cSent,setCSent]=useState(false);
  const [cErr,setCErr]=useState('');
  const [cLoading,setCLoading]=useState(false);
  const [hForm,setHForm]=useState({nom:'',type:'',adresse:'',nombre_chambres:'',nom_responsable:'',email:'',telephone:''});
  const [hSent,setHSent]=useState(false);
  const [hErr,setHErr]=useState('');
  const [hLoading,setHLoading]=useState(false);

  async function handleLogin(e){
    e.preventDefault();setErr('');setLoading(true);
    try{
      if(code.trim()==='locally2024'){sessionStorage.setItem('adm','1');window.history.pushState({},'','/admin');onLogin('admin');return;}
      const{data:cand}=await supabase.from('candidates').select('slug').eq('access_code',code.trim()).eq('status','approuve').maybeSingle();
      if(cand?.slug){localStorage.setItem('partner_slug',cand.slug);window.history.pushState({},'',`/partner/${cand.slug}`);onLogin('partner');return;}
      const{data:hotel}=await supabase.from('hotels').select('slug').eq('access_code',code.trim()).eq('status','approuve').maybeSingle();
      if(hotel?.slug){localStorage.setItem('hotel_slug',hotel.slug);window.history.pushState({},'',`/hotel/${hotel.slug}`);onLogin('hotel');return;}
      setErr('Code incorrect.');
    }catch{setErr('Code incorrect.');}
    finally{setLoading(false);}
  }

  async function handleCommerceSubmit(e){
    e.preventDefault();setCErr('');
    if(cForm.categorie==='Autre'&&!cForm.categorie_autre.trim()){setCErr('Veuillez préciser la catégorie.');return;}
    if(!cForm.reduction.trim()){setCErr('Veuillez indiquer une réduction.');return;}
    setCLoading(true);
    try{
      const cat=cForm.categorie==='Autre'?cForm.categorie_autre.trim():cForm.categorie;
      const{error}=await supabase.from('candidates').insert([{nom:cForm.nom.trim(),categorie:cat,google_maps:cForm.google_maps.trim(),telephone:cForm.telephone.trim(),description:cForm.description.trim(),reduction:cForm.reduction.trim()+'%',email:cForm.email.trim(),status:'pending'}]);
      if(error)throw error;
      setCSent(true);
    }catch(err){console.error('[Locally] candidates INSERT error:',err);setCErr('Une erreur est survenue. Veuillez réessayer.');}
    finally{setCLoading(false);}
  }

  async function handleHotelSubmit(e){
    e.preventDefault();setHErr('');setHLoading(true);
    try{
      const{error}=await supabase.from('hotels').insert([{nom:hForm.nom.trim(),type:hForm.type,adresse:hForm.adresse.trim(),nombre_chambres:hForm.nombre_chambres?parseInt(hForm.nombre_chambres):null,responsable:hForm.nom_responsable.trim(),email:hForm.email.trim(),telephone:hForm.telephone.trim(),status:'pending'}]);
      if(error)throw error;
      setHSent(true);
    }catch{setHErr('Une erreur est survenue. Veuillez réessayer.');}
    finally{setHLoading(false);}
  }

  return(
    <div className="lgn-wrap">
      <style>{CSS}</style>
      <div className="lgn-logo fd" onClick={()=>{window.history.pushState({},'','/');onLogin('home');}}>local<em>ly</em></div>
      <div className="lgn-card">
        {view==='home'&&(
          <>
            <div className="lgn-title fd">Bienvenue</div>
            <div className="lgn-sub fb">Connectez-vous ou faites une candidature pour rejoindre Locally.</div>
            <hr className="lgn-divider"/>
            <div className="lgn-section-label fb">Se connecter</div>
            <form onSubmit={handleLogin}>
              <input className="lgn-input fb" type="password" autoComplete="current-password" placeholder="Code d'accès" value={code} onChange={e=>{setCode(e.target.value);setErr('');}} required/>
              {err&&<div className="lgn-err fb">{err}</div>}
              <button type="submit" className="lgn-btn fb" disabled={loading}>{loading?'Vérification…':'Se connecter →'}</button>
            </form>
            <hr className="lgn-divider"/>
            <div className="lgn-section-label fb">Faire une candidature</div>
            <button className="lgn-choice-btn fb" onClick={()=>setView('commerce')}><span>Je suis un commerce</span><span>→</span></button>
            <button className="lgn-choice-btn fb" onClick={()=>setView('hotel')}><span>Je suis un hôtel / Airbnb</span><span>→</span></button>
          </>
        )}
        {view==='commerce'&&(
          <>
            <button className="lgn-back fb" onClick={()=>setView('home')}>← Retour</button>
            {cSent?(
              <div className="lgn-success">
                <div className="lgn-success-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7FD4A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
                <div className="lgn-success-title fd">Candidature envoyée</div>
                <div className="lgn-success-desc fb">Nous étudierons votre dossier et reviendrons vers vous rapidement.</div>
              </div>
            ):(
              <>
                <div className="lgn-title fd">Commerce</div>
                <div className="lgn-sub fb">Remplissez ce formulaire pour rejoindre Locally en tant que commerce partenaire.</div>
                <form onSubmit={handleCommerceSubmit} noValidate>
                  {[{label:"Nom de l'établissement",name:"nom",placeholder:"Le Café du Marché",type:"text"},{label:"Adresse",name:"google_maps",placeholder:"12 Rue de la Paix, Bordeaux",type:"text"},{label:"Téléphone",name:"telephone",placeholder:"06 00 00 00 00",type:"tel"},{label:"Email",name:"email",placeholder:"contact@moncommerce.fr",type:"email"}].map(({label,name,placeholder,type})=>(
                    <div key={name}><div className="lgn-field-label fb">{label}</div><input className="lgn-input fb" type={type} value={cForm[name]} onChange={e=>setCForm(f=>({...f,[name]:e.target.value}))} placeholder={placeholder} required/></div>
                  ))}
                  <div><div className="lgn-field-label fb">Catégorie</div>
                    <select className="lgn-select fb" value={cForm.categorie} onChange={e=>setCForm(f=>({...f,categorie:e.target.value}))} required>
                      <option value="" disabled>Choisir une catégorie</option>
                      {['Restauration','Boulangerie','Sport','Bien-être','Activité','Autre'].map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                  {cForm.categorie==='Autre'&&<div><div className="lgn-field-label fb">Précisez la catégorie</div><input className="lgn-input fb" value={cForm.categorie_autre} onChange={e=>setCForm(f=>({...f,categorie_autre:e.target.value}))} placeholder="Ex: Librairie, Fleuriste…" required/></div>}
                  <div><div className="lgn-field-label fb">Description courte</div><textarea className="lgn-textarea fb" value={cForm.description} onChange={e=>setCForm(f=>({...f,description:e.target.value}))} placeholder="Décrivez votre établissement…" required/></div>
                  <div><div className="lgn-field-label fb">Réduction proposée</div>
                    <div className="lgn-input-group">
                      <input className="lgn-input fb" type="number" min="1" max="100" value={cForm.reduction} onChange={e=>setCForm(f=>({...f,reduction:e.target.value}))} placeholder="10" required style={{MozAppearance:'textfield'}}/>
                      <span className="lgn-input-suffix fb">%</span>
                    </div>
                  </div>
                  {cErr&&<div className="lgn-err fb">{cErr}</div>}
                  <button type="submit" className="lgn-btn fb" disabled={cLoading}>{cLoading?'Envoi en cours…':'Envoyer la candidature →'}</button>
                </form>
              </>
            )}
          </>
        )}
        {view==='hotel'&&(
          <>
            <button className="lgn-back fb" onClick={()=>setView('home')}>← Retour</button>
            {hSent?(
              <div className="lgn-success">
                <div className="lgn-success-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7FD4A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
                <div className="lgn-success-title fd">Candidature reçue</div>
                <div className="lgn-success-desc fb">Nous étudierons votre dossier et reviendrons vers vous rapidement.</div>
              </div>
            ):(
              <>
                <div className="lgn-title fd">Hôtel / Airbnb</div>
                <div className="lgn-sub fb">Proposez le pass Locally à vos voyageurs.</div>
                <form onSubmit={handleHotelSubmit} noValidate>
                  {[{label:"Nom de l'établissement",name:"nom",placeholder:"Hôtel des Quais"},{label:"Adresse",name:"adresse",placeholder:"12 Quai des Chartrons, Bordeaux"},{label:"Nom du responsable",name:"nom_responsable",placeholder:"Jean Dupont"},{label:"Email",name:"email",placeholder:"contact@hotel.fr",type:"email"},{label:"Téléphone",name:"telephone",placeholder:"05 56 00 00 00",type:"tel"}].map(({label,name,placeholder,type="text"})=>(
                    <div key={name}><div className="lgn-field-label fb">{label}</div><input className="lgn-input fb" type={type} value={hForm[name]} onChange={e=>setHForm(f=>({...f,[name]:e.target.value}))} placeholder={placeholder} required/></div>
                  ))}
                  <div><div className="lgn-field-label fb">Type d'établissement</div>
                    <select className="lgn-select fb" value={hForm.type} onChange={e=>setHForm(f=>({...f,type:e.target.value}))} required>
                      <option value="" disabled>Choisir un type</option>
                      {['Hôtel','Airbnb','Résidence'].map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div><div className="lgn-field-label fb">Nombre de chambres <span style={{color:'rgba(247,243,238,.25)',fontWeight:300,textTransform:'none',letterSpacing:0}}>— optionnel</span></div><input className="lgn-input fb" type="number" min="1" value={hForm.nombre_chambres} onChange={e=>setHForm(f=>({...f,nombre_chambres:e.target.value}))} placeholder="Ex: 20"/></div>
                  {hErr&&<div className="lgn-err fb">{hErr}</div>}
                  <button type="submit" className="lgn-btn fb" disabled={hLoading}>{hLoading?'Envoi en cours…':'Envoyer la candidature →'}</button>
                </form>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatusBadge({status}){
  const b=STATUS_BADGES[status]||STATUS_BADGES.pending;
  return <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:500,letterSpacing:'.1em',textTransform:'uppercase',padding:'4px 10px',borderRadius:100,background:b.bg,color:b.color,whiteSpace:'nowrap'}}>{b.label}</span>;
}
function admFmt(d){if(!d)return '—';return new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'});}

function generateSlug(nom){
  return(nom||'').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[^a-z0-9\s]/g,'')
    .trim().replace(/\s+/g,'-').replace(/-+/g,'-');
}
function generateCode(){
  const c='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({length:6},()=>c[Math.floor(Math.random()*36)]).join('');
}
function getMetierLabels(categorie){
  switch(categorie){
    case 'Restauration':
    case 'Boulangerie':
      return{ongletLabel:'Mon menu',sectionLabel:'Notre menu',ajouterLabel:'+ Ajouter un article',emptyLabel:'Aucun article dans le menu.',formTitle:(edit)=>edit?"Modifier l'article":'Nouvel article',nomPlaceholder:"Nom de l'article",descPlaceholder:"Description de l'article"};
    case 'Sport':
      return{ongletLabel:'Mes prestations',sectionLabel:'Nos prestations',ajouterLabel:'+ Ajouter une prestation',emptyLabel:'Aucune prestation ajoutée.',formTitle:(edit)=>edit?'Modifier la prestation':'Nouvelle prestation',nomPlaceholder:'Nom de la prestation',descPlaceholder:'Description de la prestation'};
    case 'Bien-être':
      return{ongletLabel:'Mes services',sectionLabel:'Nos services',ajouterLabel:'+ Ajouter un service',emptyLabel:'Aucun service ajouté.',formTitle:(edit)=>edit?'Modifier le service':'Nouveau service',nomPlaceholder:'Nom du service',descPlaceholder:'Description du service'};
    case 'Activité':
      return{ongletLabel:'Mes activités',sectionLabel:'Nos activités',ajouterLabel:'+ Ajouter une activité',emptyLabel:'Aucune activité ajoutée.',formTitle:(edit)=>edit?"Modifier l'activité":'Nouvelle activité',nomPlaceholder:"Nom de l'activité",descPlaceholder:"Description de l'activité"};
    default:
      return{ongletLabel:'Mes offres',sectionLabel:'Nos offres',ajouterLabel:'+ Ajouter une offre',emptyLabel:'Aucune offre ajoutée.',formTitle:(edit)=>edit?"Modifier l'offre":'Nouvelle offre',nomPlaceholder:"Nom de l'offre",descPlaceholder:"Description de l'offre"};
  }
}

function AdminView(){
  const [authed,setAuthed]=useState(()=>sessionStorage.getItem('adm')==='1');
  const [pwd,setPwd]=useState('');
  const [loginErr,setLoginErr]=useState('');
  const [tab,setTab]=useState('candidatures');
  const [cands,setCands]=useState([]);
  const [candSubTab,setCandSubTab]=useState('commerces');
  const [rejectedSubTab,setRejectedSubTab]=useState('commerces');
  const [loadingCand,setLoadingCand]=useState(false);
  const [sel,setSel]=useState(null);
  const [confirmReject,setConfirmReject]=useState(false);
  const [selAccess,setSelAccess]=useState({slug:'',access_code:''});
  const [savingAccess,setSavingAccess]=useState(false);
  const [accessSaved,setAccessSaved]=useState(false);
  const [accessErr,setAccessErr]=useState('');
  const [selCatEdit,setSelCatEdit]=useState('');
  const [savingCat,setSavingCat]=useState(false);
  const [catSaved,setCatSaved]=useState(false);
  const [catErr,setCatErr]=useState('');
  const [partners,setPartners]=useState([]);
  const [loadingPartners,setLoadingPartners]=useState(false);
  const [selPartner,setSelPartner]=useState(null);
  const [partnerVisits,setPartnerVisits]=useState([]);
  const [loadingPV,setLoadingPV]=useState(false);
  const [confirmPDisable,setConfirmPDisable]=useState(false);
  const [savingComm,setSavingComm]=useState(false);
  const [commSaved,setCommSaved]=useState(false);
  const [hotelMessages,setHotelMessages]=useState([]);
  const [loadingHM,setLoadingHM]=useState(false);
  const [unreadHotelMessages,setUnreadHotelMessages]=useState({});
  const [visits,setVisits]=useState([]);
  const [loadingVisits,setLoadingVisits]=useState(false);
  const [hotels,setHotels]=useState([]);
  const [loadingHotels,setLoadingHotels]=useState(false);
  const [selHotel,setSelHotel]=useState(null);
  const [confirmHotelReject,setConfirmHotelReject]=useState(false);
  const [hotelAccess,setHotelAccess]=useState({slug:'',access_code:''});
  const [savingHotelAccess,setSavingHotelAccess]=useState(false);
  const [hotelAccessSaved,setHotelAccessSaved]=useState(false);
  const [hotelAccessErr,setHotelAccessErr]=useState('');
  const [refreshing,setRefreshing]=useState(false);
  const [unreadMessages,setUnreadMessages]=useState({});
  const [partnerMessages,setPartnerMessages]=useState([]);
  const [loadingPM,setLoadingPM]=useState(false);
  const [adminPwdForm,setAdminPwdForm]=useState({code1:'',code2:''});
  const [adminPwdErr,setAdminPwdErr]=useState('');
  const [adminPwdSaved,setAdminPwdSaved]=useState(false);
  const [badgePending,setBadgePending]=useState(0);
  const [countPartners,setCountPartners]=useState(0);
  const [countHotels,setCountHotels]=useState(0);
  const [badgePartnerMsgs,setBadgePartnerMsgs]=useState(0);
  const [badgeHotelMsgs,setBadgeHotelMsgs]=useState(0);
  const [adminStats,setAdminStats]=useState(null);
  const [adminChartData,setAdminChartData]=useState([]);
  const [adminTopPartners,setAdminTopPartners]=useState([]);
  const [loadingAdminStats,setLoadingAdminStats]=useState(false);

  function login(e){
    e.preventDefault();
    if(pwd===ADMIN_PWD){sessionStorage.setItem('adm','1');setAuthed(true);}
    else setLoginErr('Mot de passe incorrect.');
  }
  function logout(){sessionStorage.removeItem('adm');setAuthed(false);setPwd('');}
  async function fetchBadges(){
    const[{count:pc},{count:hc},{count:pa},{count:ha},{count:pmu},{count:hmu}]=await Promise.all([
      supabase.from('candidates').select('*',{count:'exact',head:true}).eq('status','pending'),
      supabase.from('hotels').select('*',{count:'exact',head:true}).eq('status','pending'),
      supabase.from('candidates').select('*',{count:'exact',head:true}).eq('status','approuve'),
      supabase.from('hotels').select('*',{count:'exact',head:true}).eq('status','approuve'),
      supabase.from('messages').select('*',{count:'exact',head:true}).eq('status','non_lu').not('partner_id','is',null),
      supabase.from('messages').select('*',{count:'exact',head:true}).eq('status','non_lu').not('hotel_slug','is',null),
    ]);
    setBadgePending((pc||0)+(hc||0));
    setCountPartners(pa||0);
    setCountHotels(ha||0);
    setBadgePartnerMsgs(pmu||0);
    setBadgeHotelMsgs(hmu||0);
  }
  useEffect(()=>{if(authed)fetchBadges();},[authed]);
  function saveAdminPwd(){
    if(!adminPwdForm.code1.trim()){setAdminPwdErr('Le code ne peut pas être vide.');return;}
    if(adminPwdForm.code1!==adminPwdForm.code2){setAdminPwdErr('Les codes ne correspondent pas.');return;}
    ADMIN_PWD=adminPwdForm.code1.trim();
    setAdminPwdErr('');setAdminPwdSaved(true);setAdminPwdForm({code1:'',code2:''});
  }
  async function fetchAdminStats(){
    setLoadingAdminStats(true);
    const thirtyDaysAgo=new Date();thirtyDaysAgo.setDate(thirtyDaysAgo.getDate()-30);
    const from30=thirtyDaysAgo.toISOString();
    const[
      {data:txnsAll},
      {count:clientCount},
      {count:qrTotal},
      {count:qrScanned},
      {count:partnerActiveCount},
      {data:txns30},
      {data:allCands},
    ]=await Promise.all([
      supabase.from('transactions').select('montant_client,montant_reduction,partner_id,created_at'),
      supabase.from('profiles').select('*',{count:'exact',head:true}),
      supabase.from('visits').select('*',{count:'exact',head:true}),
      supabase.from('visits').select('*',{count:'exact',head:true}).eq('scanned',true),
      supabase.from('candidates').select('*',{count:'exact',head:true}).eq('status','approuve'),
      supabase.from('transactions').select('montant_client,created_at').gte('created_at',from30),
      supabase.from('candidates').select('id,nom').eq('status','approuve'),
    ]);
    const txns=txnsAll||[];
    const caTotal=txns.reduce((s,t)=>s+(t.montant_client||0),0);
    const economiesTotal=txns.reduce((s,t)=>s+(t.montant_reduction||0),0);
    const conversionRate=(qrTotal||0)>0?Math.round(((qrScanned||0)/(qrTotal||1))*100):0;
    const avgTxn=(clientCount||0)>0?(txns.length/(clientCount||1)).toFixed(1):0;
    setAdminStats({caTotal,economiesTotal,clientCount:clientCount||0,qrTotal:qrTotal||0,qrScanned:qrScanned||0,partnerActiveCount:partnerActiveCount||0,conversionRate,avgTxn,txnTotal:txns.length});
    const days=[];
    for(let i=29;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days.push(d.toISOString().slice(0,10));}
    const caByDay={};
    (txns30||[]).forEach(t=>{const day=t.created_at.slice(0,10);caByDay[day]=(caByDay[day]||0)+(t.montant_client||0);});
    setAdminChartData(days.map(date=>({date,ca:caByDay[date]||0})));
    const candMap={};(allCands||[]).forEach(c=>{candMap[c.id]=c.nom;});
    const byPartner={};
    txns.forEach(t=>{
      if(!t.partner_id)return;
      if(!byPartner[t.partner_id])byPartner[t.partner_id]={nom:candMap[t.partner_id]||t.partner_id,ca:0,txns:0};
      byPartner[t.partner_id].ca+=(t.montant_client||0);
      byPartner[t.partner_id].txns++;
    });
    const top=Object.entries(byPartner).map(([id,v])=>({id,...v})).sort((a,b)=>b.ca-a.ca).slice(0,8);
    setAdminTopPartners(top);
    setLoadingAdminStats(false);
  }
  async function refresh(){
    setRefreshing(true);
    await Promise.all([fetchCands(),fetchPartners(),fetchHotels(),fetchVisits(),fetchAdminStats(),fetchBadges()]);
    setRefreshing(false);
  }

  async function fetchCands(){
    setLoadingCand(true);
    const{data}=await supabase.from('candidates').select('*').order('created_at',{ascending:false});
    setCands(data||[]);setLoadingCand(false);
  }
  async function fetchPartners(){
    setLoadingPartners(true);
    const[{data},{data:msgs}]=await Promise.all([
      supabase.from('candidates').select('*').eq('status','approuve').order('created_at',{ascending:false}),
      supabase.from('messages').select('partner_id').eq('status','non_lu').not('partner_id','is',null),
    ]);
    setPartners(data||[]);setLoadingPartners(false);
    const counts={};(msgs||[]).forEach(m=>{counts[m.partner_id]=(counts[m.partner_id]||0)+1;});
    setUnreadMessages(counts);
    setBadgePartnerMsgs((msgs||[]).length);
  }
  async function fetchVisits(){
    setLoadingVisits(true);
    const{data}=await supabase.from('visits').select('*').order('created_at',{ascending:false});
    setVisits(data||[]);setLoadingVisits(false);
  }
  async function fetchHotels(){
    setLoadingHotels(true);
    const[{data},{data:msgs}]=await Promise.all([
      supabase.from('hotels').select('*').order('created_at',{ascending:false}),
      supabase.from('messages').select('hotel_slug').eq('status','non_lu').not('hotel_slug','is',null),
    ]);
    setHotels(data||[]);setLoadingHotels(false);
    const counts={};(msgs||[]).forEach(m=>{counts[m.hotel_slug]=(counts[m.hotel_slug]||0)+1;});
    setUnreadHotelMessages(counts);
    setBadgeHotelMsgs((msgs||[]).length);
  }
  async function saveHotelAccess(){
    setSavingHotelAccess(true);setHotelAccessErr('');
    const{error}=await supabase.from('hotels').update({slug:hotelAccess.slug.trim(),access_code:hotelAccess.access_code.trim()}).eq('id',selHotel.id);
    setSavingHotelAccess(false);
    if(error){setHotelAccessErr('Erreur : '+error.message);return;}
    setSelHotel(s=>({...s,slug:hotelAccess.slug.trim(),access_code:hotelAccess.access_code.trim()}));
    setHotelAccessSaved(true);setTimeout(()=>setHotelAccessSaved(false),2500);
  }
  async function sendSms(telephone,nom,status,access_code){
    let message;
    if(status==='approuve') message=`Bonjour ${nom}, votre candidature Locally a été acceptée ! Votre code d'accès : ${access_code}. Connectez-vous sur : locally-gules.vercel.app/login`;
    else if(status==='rejete') message=`Bonjour ${nom}, nous avons bien étudié votre candidature Locally mais ne pouvons pas donner suite pour le moment. Merci de votre intérêt.`;
    else if(status==='en_attente') message=`Bonjour ${nom}, nous avons bien reçu votre candidature Locally. Nous revenons vers vous rapidement.`;
    else return;
    console.log('[SMS] Envoi →', {to:telephone,message});
    const res=await fetch('https://lsorbtjjyiseqryigezy.supabase.co/functions/v1/Send-SMS',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+import.meta.env.VITE_SUPABASE_ANON_KEY},
      body:JSON.stringify({to:telephone,message}),
    });
    console.log('[SMS] Réponse →',res.status,await res.text().catch(()=>''));
  }
  async function updateHotelStatus(id,status,slug,access_code){
    const updates={status};
    if(slug)updates.slug=slug;
    if(access_code)updates.access_code=access_code;
    const{error}=await supabase.from('hotels').update(updates).eq('id',id);
    if(error){setHotelAccessErr('Erreur approbation : '+error.message);return;}
    const item=hotels.find(h=>h.id===id);
    const extra=slug&&access_code?{slug,access_code}:{};
    setHotels(hs=>hs.map(h=>h.id===id?{...h,status,...extra}:h));
    setSelHotel(s=>s?.id===id?{...s,status,...extra}:s);
    if(slug&&access_code)setHotelAccess({slug,access_code});
    setConfirmHotelReject(false);
    if(item?.telephone) sendSms(item.telephone,item.nom,status,access_code||item.access_code).catch(err=>console.error('SMS hotel error:',err));
    fetchBadges();
  }
  async function openPartner(p){
    setSelPartner(p);setConfirmPDisable(false);setPartnerVisits([]);setPartnerMessages([]);
    setLoadingPV(true);setLoadingPM(true);
    const[{data:visits},{data:msgs}]=await Promise.all([
      supabase.from('visits').select('*').eq('partner_id',p.id).order('created_at',{ascending:false}),
      supabase.from('messages').select('*').eq('partner_id',p.id).order('created_at',{ascending:false}),
    ]);
    setPartnerVisits(visits||[]);setLoadingPV(false);
    const unread=(msgs||[]).filter(m=>m.status==='non_lu');
    if(unread.length>0){
      await Promise.all(unread.map(m=>supabase.from('messages').update({status:'lu'}).eq('id',m.id)));
      setBadgePartnerMsgs(b=>Math.max(0,b-unread.length));
      setUnreadMessages(u=>{const n={...u};delete n[p.id];return n;});
    }
    setPartnerMessages((msgs||[]).map(m=>({...m,status:'lu'})));setLoadingPM(false);
  }
  async function markAsRead(msgId,partnerId){
    await supabase.from('messages').update({status:'lu'}).eq('id',msgId);
    setPartnerMessages(ms=>ms.map(m=>m.id===msgId?{...m,status:'lu'}:m));
    setUnreadMessages(u=>{const n={...u};n[partnerId]=Math.max(0,(n[partnerId]||1)-1);if(!n[partnerId])delete n[partnerId];return n;});
    setBadgePartnerMsgs(b=>Math.max(0,b-1));
  }
  async function openHotel(h){
    setSelHotel(h);setConfirmHotelReject(false);
    setHotelAccess({slug:h.slug||'',access_code:h.access_code||''});setHotelAccessSaved(false);setHotelAccessErr('');
    setHotelMessages([]);setLoadingHM(true);
    const{data:msgs}=await supabase.from('messages').select('*').eq('hotel_slug',h.slug||'').order('created_at',{ascending:false});
    const unread=(msgs||[]).filter(m=>m.status==='non_lu');
    if(unread.length>0){
      await Promise.all(unread.map(m=>supabase.from('messages').update({status:'lu'}).eq('id',m.id)));
      setBadgeHotelMsgs(b=>Math.max(0,b-unread.length));
      setUnreadHotelMessages(u=>{const n={...u};delete n[h.slug];return n;});
    }
    setHotelMessages((msgs||[]).map(m=>({...m,status:'lu'})));setLoadingHM(false);
  }
  async function markHotelMsgAsRead(msgId,hotelSlug){
    await supabase.from('messages').update({status:'lu'}).eq('id',msgId);
    setHotelMessages(ms=>ms.map(m=>m.id===msgId?{...m,status:'lu'}:m));
    setUnreadHotelMessages(u=>{const n={...u};n[hotelSlug]=Math.max(0,(n[hotelSlug]||1)-1);if(!n[hotelSlug])delete n[hotelSlug];return n;});
    setBadgeHotelMsgs(b=>Math.max(0,b-1));
  }

  useEffect(()=>{
    if(!authed)return;
    if(tab==='candidatures'||tab==='rejetes'){fetchCands();fetchHotels();}
    else if(tab==='partenaires')fetchPartners();
    else if(tab==='hotels')fetchHotels();
    else if(tab==='stats')fetchAdminStats();
    else fetchVisits();
  },[authed,tab]);

  async function saveAccess(){
    setSavingAccess(true);setAccessErr('');
    const{error}=await supabase.from('candidates').update({slug:selAccess.slug.trim(),access_code:selAccess.access_code.trim()}).eq('id',sel.id);
    setSavingAccess(false);
    if(error){setAccessErr('Erreur : '+error.message);return;}
    setSel(s=>({...s,slug:selAccess.slug.trim(),access_code:selAccess.access_code.trim()}));
    setAccessSaved(true);setTimeout(()=>setAccessSaved(false),2500);
  }
  function copyPartnerLink(){
    navigator.clipboard.writeText(`locally-gules.vercel.app/partner/${selAccess.slug.trim()}`);
  }
  async function saveCommActive(val){
    setSavingComm(true);
    await supabase.from('candidates').update({commission_active:val}).eq('id',selPartner.id);
    setSelPartner(p=>({...p,commission_active:val}));
    setPartners(ps=>ps.map(p=>p.id===selPartner.id?{...p,commission_active:val}:p));
    setSavingComm(false);setCommSaved(true);setTimeout(()=>setCommSaved(false),2500);
  }
  async function geocodePartner(id,adresse){
    const res=await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(adresse)}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`);
    const json=await res.json();
    const loc=json.results?.[0]?.geometry?.location;
    if(loc)await supabase.from('candidates').update({latitude:loc.lat,longitude:loc.lng}).eq('id',id);
  }
  async function updateStatus(id,status,slug,access_code){
    const updates={status};
    if(slug)updates.slug=slug;
    if(access_code)updates.access_code=access_code;
    const{error}=await supabase.from('candidates').update(updates).eq('id',id);
    if(error){setAccessErr('Erreur approbation : '+error.message);return;}
    const item=cands.find(c=>c.id===id)||partners.find(p=>p.id===id);
    const extra=slug&&access_code?{slug,access_code}:{};
    setCands(cs=>cs.map(c=>c.id===id?{...c,status,...extra}:c));
    setSel(s=>s?.id===id?{...s,status,...extra}:s);
    if(slug&&access_code)setSelAccess({slug,access_code});
    if(status==='approuve'){
      if(item) setPartners(ps=>[...ps.filter(p=>p.id!==id),{...item,status:'approuve',...extra}]);
      if(item?.adresse)geocodePartner(id,item.adresse).catch(()=>{});
    } else {
      setPartners(ps=>ps.filter(p=>p.id!==id));
    }
    setSelPartner(null);
    setConfirmReject(false);
    setConfirmPDisable(false);
    if(item?.telephone) sendSms(item.telephone,item.nom,status,access_code||item.access_code).catch(err=>console.error('SMS commerce error:',err));
    fetchBadges();
  }


  if(!authed) return(
    <div style={{minHeight:'100dvh',background:'#1C1208',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
      <style>{CSS}</style>
      <div className="adm-login">
        <div className="adm-logo fd">local<em>ly</em><span className="fb"> admin</span></div>
        <form onSubmit={login}>
          <input className="adm-input fb" type="password" placeholder="Mot de passe" value={pwd} onChange={e=>{setPwd(e.target.value);setLoginErr('');}} autoFocus/>
          {loginErr&&<div className="adm-err fb">{loginErr}</div>}
          <button type="submit" className="adm-btn fb">Accéder →</button>
        </form>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:'100dvh',background:'#1C1208',display:'flex',flexDirection:'column'}}>
      <style>{CSS}</style>
      <div className="adm-header">
        <div className="adm-logo fd">local<em>ly</em><span className="fb"> admin</span></div>
        <div className="adm-tabs">
          {[
            ['candidatures',<>Candidatures{badgePending>0&&<span style={{background:'#B91C1C',color:'white',borderRadius:9,fontSize:9,padding:'1px 6px',marginLeft:5,fontWeight:600,lineHeight:1}}>{badgePending}</span>}</>],
            ['partenaires',<>Partenaires{countPartners>0&&<span style={{opacity:.65,fontSize:10,marginLeft:3}}>({countPartners})</span>}{badgePartnerMsgs>0&&<span style={{width:6,height:6,borderRadius:'50%',background:'#B91C1C',display:'inline-block',marginLeft:5,verticalAlign:'middle',flexShrink:0}}/>}</>],
            ['hotels',<>Hôtels{countHotels>0&&<span style={{opacity:.65,fontSize:10,marginLeft:3}}>({countHotels})</span>}{badgeHotelMsgs>0&&<span style={{width:6,height:6,borderRadius:'50%',background:'#B91C1C',display:'inline-block',marginLeft:5,verticalAlign:'middle',flexShrink:0}}/>}</>],
            ['rejetes','Rejetés'],
            ['stats','Statistiques'],
            ['parametres','Paramètres'],
          ].map(([v,l])=>(
            <button key={v} className={'adm-tab fb'+(tab===v?' act':'')} onClick={()=>setTab(v)}>{l}</button>
          ))}
        </div>
        <button className="adm-refresh" onClick={refresh} disabled={refreshing} title="Actualiser">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={refreshing?{animation:'adm-spin .7s linear infinite'}:{}}>
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </button>
        <button className="adm-logout fb" onClick={logout}>Déconnexion</button>
      </div>

      <div className="adm-content">
        {tab==='candidatures'&&(
          <>
            <div className="adm-filters">
              <button className={'adm-filter fb'+(candSubTab==='commerces'?' act':'')} onClick={()=>setCandSubTab('commerces')}>Commerces</button>
              <button className={'adm-filter fb'+(candSubTab==='hotels'?' act':'')} onClick={()=>setCandSubTab('hotels')}>Hôtels</button>
            </div>
            {candSubTab==='commerces'&&(loadingCand?<div className="adm-empty fb">Chargement…</div>:(
              <div className="adm-list">
                {cands.filter(c=>c.status==='pending'||c.status==='en_attente').length===0&&<div className="adm-empty fb">Aucune candidature commerce.</div>}
                {cands.filter(c=>c.status==='pending'||c.status==='en_attente').map(c=>(
                  <div key={c.id} className="adm-row" onClick={()=>{setSel(c);setConfirmReject(false);setSelAccess({slug:c.slug||'',access_code:c.access_code||''});setAccessSaved(false);setAccessErr('');setSelCatEdit(c.categorie||'');setCatSaved(false);setCatErr('');}}>
                    <div className="adm-row-body">
                      <div className="adm-row-name">{c.nom}</div>
                      <div className="adm-row-meta fb">{c.categorie} · {admFmt(c.created_at)}</div>
                    </div>
                    <StatusBadge status={c.status}/>
                    <span className="adm-arrow">›</span>
                  </div>
                ))}
              </div>
            ))}
            {candSubTab==='hotels'&&(loadingHotels?<div className="adm-empty fb">Chargement…</div>:(
              <div className="adm-list">
                {hotels.filter(h=>h.status==='pending'||h.status==='en_attente').length===0&&<div className="adm-empty fb">Aucune candidature hôtel.</div>}
                {hotels.filter(h=>h.status==='pending'||h.status==='en_attente').map(h=>(
                  <div key={h.id} className="adm-row" onClick={()=>openHotel(h)}>
                    <div className="adm-row-body">
                      <div className="adm-row-name">{h.nom}</div>
                      <div className="adm-row-meta fb">{h.type} · {h.adresse}</div>
                      <div className="adm-row-sub fb">{h.email} · {admFmt(h.created_at)}</div>
                    </div>
                    <StatusBadge status={h.status}/>
                    <span className="adm-arrow">›</span>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}

        {tab==='partenaires'&&(
          <>
            {loadingPartners?<div className="adm-empty fb">Chargement…</div>:(
              <div className="adm-list">
                {partners.length===0&&<div className="adm-empty fb">Aucun partenaire approuvé.</div>}
                {partners.map(p=>(
                  <div key={p.id} className="adm-row" onClick={()=>openPartner(p)}>
                    <div className="adm-row-body">
                      <div className="adm-row-name" style={{display:'flex',alignItems:'center',gap:8}}>
                        {p.nom}
                        {unreadMessages[p.id]&&<span style={{background:'#EF4444',color:'#fff',fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:600,borderRadius:100,padding:'2px 7px',lineHeight:1.4}}>{unreadMessages[p.id]}</span>}
                      </div>
                      <div className="adm-row-meta fb">{p.categorie} · {p.telephone}</div>
                      <div className="adm-row-sub fb">{p.email} · Depuis le {admFmt(p.created_at)}</div>
                    </div>
                    <span className="adm-arrow">›</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab==='hotels'&&(
          <>
            {loadingHotels?<div className="adm-empty fb">Chargement…</div>:(
              <div className="adm-list">
                {hotels.filter(h=>h.status==='approuve').length===0&&<div className="adm-empty fb">Aucun hôtel approuvé.</div>}
                {hotels.filter(h=>h.status==='approuve').map(h=>(
                  <div key={h.id} className="adm-row" onClick={()=>openHotel(h)}>
                    <div className="adm-row-body">
                      <div className="adm-row-name" style={{display:'flex',alignItems:'center',gap:8}}>
                        {h.nom}
                        {unreadHotelMessages[h.slug]&&<span style={{background:'#EF4444',color:'#fff',fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:600,borderRadius:100,padding:'2px 7px',lineHeight:1.4}}>{unreadHotelMessages[h.slug]}</span>}
                      </div>
                      <div className="adm-row-meta fb">{h.type} · {h.adresse}</div>
                      <div className="adm-row-sub fb">{h.email} · Depuis le {admFmt(h.created_at)}</div>
                    </div>
                    <span className="adm-arrow">›</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab==='rejetes'&&(
          <>
            <div className="adm-filters">
              <button className={'adm-filter fb'+(rejectedSubTab==='commerces'?' act':'')} onClick={()=>setRejectedSubTab('commerces')}>Commerces</button>
              <button className={'adm-filter fb'+(rejectedSubTab==='hotels'?' act':'')} onClick={()=>setRejectedSubTab('hotels')}>Hôtels</button>
            </div>
            {rejectedSubTab==='commerces'&&(loadingCand?<div className="adm-empty fb">Chargement…</div>:(
              <div className="adm-list">
                {cands.filter(c=>c.status==='rejete').length===0&&<div className="adm-empty fb">Aucun commerce rejeté.</div>}
                {cands.filter(c=>c.status==='rejete').map(c=>(
                  <div key={c.id} className="adm-row" onClick={()=>{setSel(c);setConfirmReject(false);setSelAccess({slug:c.slug||'',access_code:c.access_code||''});setAccessSaved(false);setAccessErr('');setSelCatEdit(c.categorie||'');setCatSaved(false);setCatErr('');}}>
                    <div className="adm-row-body">
                      <div className="adm-row-name">{c.nom}</div>
                      <div className="adm-row-meta fb">{c.categorie} · {admFmt(c.created_at)}</div>
                    </div>
                    <StatusBadge status={c.status}/>
                    <span className="adm-arrow">›</span>
                  </div>
                ))}
              </div>
            ))}
            {rejectedSubTab==='hotels'&&(loadingHotels?<div className="adm-empty fb">Chargement…</div>:(
              <div className="adm-list">
                {hotels.filter(h=>h.status==='rejete').length===0&&<div className="adm-empty fb">Aucun hôtel rejeté.</div>}
                {hotels.filter(h=>h.status==='rejete').map(h=>(
                  <div key={h.id} className="adm-row" onClick={()=>openHotel(h)}>
                    <div className="adm-row-body">
                      <div className="adm-row-name">{h.nom}</div>
                      <div className="adm-row-meta fb">{h.type} · {h.adresse}</div>
                      <div className="adm-row-sub fb">{h.email} · {admFmt(h.created_at)}</div>
                    </div>
                    <StatusBadge status={h.status}/>
                    <span className="adm-arrow">›</span>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}

        {tab==='stats'&&(
          <>
            {loadingAdminStats&&!adminStats?<div className="adm-empty fb">Chargement des statistiques…</div>:(
              <>
                {/* ── CHIFFRES GLOBAUX ── */}
                <div className="adm-section-label">Chiffres globaux</div>
                <div className="adm-global-grid" style={{marginBottom:8}}>
                  <div className="adm-global-card accent">
                    <div className="adm-global-num fd">{adminStats?(adminStats.caTotal).toFixed(0)+'€':'—'}</div>
                    <div className="adm-global-label">CA total généré</div>
                  </div>
                  <div className="adm-global-card">
                    <div className="adm-global-num fd">{adminStats?adminStats.clientCount:'—'}</div>
                    <div className="adm-global-label">Clients inscrits</div>
                  </div>
                  <div className="adm-global-card">
                    <div className="adm-global-num fd">{adminStats?adminStats.partnerActiveCount:'—'}</div>
                    <div className="adm-global-label">Partenaires actifs</div>
                  </div>
                </div>
                <div className="adm-global-grid">
                  <div className="adm-global-card">
                    <div className="adm-global-num fd">{adminStats?adminStats.qrTotal:'—'}</div>
                    <div className="adm-global-label">QR générés</div>
                  </div>
                  <div className="adm-global-card">
                    <div className="adm-global-num fd">{adminStats?adminStats.qrScanned:'—'}</div>
                    <div className="adm-global-label">QR scannés</div>
                  </div>
                  <div className="adm-global-card accent">
                    <div className="adm-global-num fd">{adminStats?adminStats.conversionRate+'%':'—'}</div>
                    <div className="adm-global-label">Taux de conversion</div>
                  </div>
                </div>

                {/* ── CA 30 JOURS ── */}
                <div className="adm-section-label" style={{marginTop:20}}>Évolution CA — 30 derniers jours</div>
                <div className="adm-chart-wrap">
                  {adminChartData.length>0
                    ?<BarChart data={adminChartData}/>
                    :<div style={{height:140,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'DM Sans',sans-serif",fontSize:13,color:'rgba(247,243,238,.2)'}}>Aucune donnée</div>
                  }
                </div>

                {/* ── TOP PARTENAIRES ── */}
                <div className="adm-section-label" style={{marginTop:20}}>Top partenaires par CA</div>
                <div style={{background:'rgba(247,243,238,.03)',border:'1px solid rgba(247,243,238,.06)',borderRadius:10,padding:'4px 16px',marginBottom:8}}>
                  {adminTopPartners.length===0
                    ?<div className="adm-empty fb" style={{padding:'16px 0'}}>Aucune transaction enregistrée.</div>
                    :adminTopPartners.map((p,i)=>(
                      <div className="adm-top-row" key={p.id}>
                        <span className="adm-top-rank">{i+1}</span>
                        <span className="adm-top-nom fb">{p.nom}</span>
                        <span className="adm-top-ca fd">{p.ca.toFixed(0)}€</span>
                        <span className="adm-top-txn fb">{p.txns} txn{p.txns>1?'s':''}</span>
                      </div>
                    ))
                  }
                </div>

                {/* ── CHIFFRES HÔTELS ── */}
                <div className="adm-section-label" style={{marginTop:20}}>Chiffres clés pour les hôtels</div>
                <div className="adm-hotel-grid">
                  <div className="adm-hotel-card">
                    <div className="adm-hotel-num fd">{adminStats?(adminStats.economiesTotal).toFixed(0)+'€':'—'}</div>
                    <div className="adm-hotel-label">Économies réalisées par les clients</div>
                  </div>
                  <div className="adm-hotel-card">
                    <div className="adm-hotel-num fd">{adminStats?adminStats.avgTxn:'—'}</div>
                    <div className="adm-hotel-label">Transactions moyennes par client</div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {tab==='parametres'&&(
          <div style={{maxWidth:480,display:'flex',flexDirection:'column',gap:16}}>
            <div style={{background:'rgba(247,243,238,.04)',border:'1px solid rgba(247,243,238,.08)',borderRadius:14,padding:'24px 20px',display:'flex',flexDirection:'column',gap:14}}>
              <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:9,fontWeight:500,letterSpacing:'.18em',textTransform:'uppercase',color:'rgba(247,243,238,.35)'}}>Changer le mot de passe admin</div>
              <input className="adm-input fb" type="password" placeholder="Nouveau code" value={adminPwdForm.code1} onChange={e=>{setAdminPwdForm(f=>({...f,code1:e.target.value}));setAdminPwdErr('');setAdminPwdSaved(false);}}/>
              <input className="adm-input fb" type="password" placeholder="Confirmer le code" value={adminPwdForm.code2} onChange={e=>{setAdminPwdForm(f=>({...f,code2:e.target.value}));setAdminPwdErr('');setAdminPwdSaved(false);}}/>
              {adminPwdErr&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:'#EF4444'}}>{adminPwdErr}</div>}
              <button className="adm-btn fb" onClick={saveAdminPwd} disabled={!adminPwdForm.code1||!adminPwdForm.code2}>Enregistrer</button>
              {adminPwdSaved&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:'#10B981',lineHeight:1.5}}>✓ Code mis à jour — pensez à mettre à jour <span style={{fontFamily:'monospace'}}>VITE_DASHBOARD_PASSWORD</span> sur Vercel pour que le changement soit permanent.</div>}
            </div>
          </div>
        )}
      </div>

      {sel&&(
        <div className="adm-overlay" onClick={e=>{if(e.target===e.currentTarget){setSel(null);setConfirmReject(false);}}}>
          <div className="adm-modal">
            <div className="adm-modal-head">
              <div className="adm-modal-title">{sel.nom}</div>
              <button className="adm-modal-close fb" onClick={()=>{setSel(null);setConfirmReject(false);}}>✕</button>
            </div>
            <div className="adm-modal-body">
              {/* Catégorie éditable */}
              {(()=>{
                const validCats=Object.keys(CATEGORIE_MAP);
                const isValid=validCats.includes(selCatEdit);
                return(
                  <div className="adm-field" style={{marginBottom:12}}>
                    <div className="adm-field-label">Catégorie</div>
                    {!isValid&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:'#B91C1C',marginBottom:6,fontWeight:500}}>⚠ Catégorie non reconnue — modifiez avant d'approuver</div>}
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <select value={selCatEdit} onChange={e=>{setSelCatEdit(e.target.value);setCatSaved(false);}} style={{flex:1,fontFamily:"'DM Sans',sans-serif",fontSize:13,padding:'7px 10px',borderRadius:7,border:'1px solid rgba(247,243,238,.15)',background:'rgba(247,243,238,.06)',color:'#F7F3EE',cursor:'pointer'}}>
                        {!isValid&&<option value={selCatEdit}>{selCatEdit} (actuel)</option>}
                        {validCats.map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                      <button onClick={async()=>{setSavingCat(true);setCatErr('');const{error}=await supabase.from('candidates').update({categorie:selCatEdit}).eq('id',sel.id);setSavingCat(false);if(error){setCatErr('Erreur');return;}setSel(s=>({...s,categorie:selCatEdit}));setCatSaved(true);setTimeout(()=>setCatSaved(false),2500);}} disabled={savingCat||isValid&&selCatEdit===sel.categorie} style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:500,padding:'7px 12px',borderRadius:7,border:'1px solid rgba(247,243,238,.2)',background:'rgba(247,243,238,.08)',color:'#F7F3EE',cursor:'pointer',whiteSpace:'nowrap',opacity:(savingCat||isValid&&selCatEdit===sel.categorie)?.45:1}}>
                        {catSaved?'✓ OK':savingCat?'…':'Modifier'}
                      </button>
                    </div>
                    {catErr&&<div style={{fontSize:11,color:'#EF4444',marginTop:4}}>{catErr}</div>}
                  </div>
                );
              })()}
              {[
                ['Adresse',sel.google_maps],
                ['Téléphone',sel.telephone],
                ['Email',sel.email],
                ['Description',sel.description],
                ['Réduction',sel.reduction],
                ['Date',admFmt(sel.created_at)],
              ].map(([k,v])=>(
                <div key={k} className="adm-field">
                  <div className="adm-field-label">{k}</div>
                  <div className="adm-field-val fb">{v}</div>
                </div>
              ))}
              <div className="adm-field">
                <div className="adm-field-label">Statut</div>
                <div style={{marginTop:2}}><StatusBadge status={sel.status}/></div>
              </div>
              {sel.status==='approuve'&&(
                <div style={{borderTop:'1px solid rgba(247,243,238,.07)',paddingTop:16,marginTop:4,display:'flex',flexDirection:'column',gap:12}}>
                  <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:9,fontWeight:500,letterSpacing:'.18em',textTransform:'uppercase',color:'#6B1D1D'}}>Accès partenaire</div>
                  <div className="adm-field">
                    <div className="adm-field-label">Identifiant URL (slug)</div>
                    <input className="adm-input fb" value={selAccess.slug} onChange={e=>setSelAccess(a=>({...a,slug:e.target.value}))} placeholder="ex: snack-bodrum" style={{marginBottom:0}}/>
                  </div>
                  <div className="adm-field">
                    <div className="adm-field-label">Code d'accès partenaire</div>
                    <input className="adm-input fb" value={selAccess.access_code} onChange={e=>setSelAccess(a=>({...a,access_code:e.target.value}))} placeholder="ex: BODRUM24" style={{marginBottom:0}}/>
                  </div>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    <button className="adm-btn fb" style={{flex:1,padding:'9px 14px',fontSize:12}} onClick={saveAccess} disabled={savingAccess}>
                      {savingAccess?'Sauvegarde…':accessSaved?'✓ Sauvegardé':'Sauvegarder les accès'}
                    </button>
                    {selAccess.slug.trim()&&(
                      <button className="fb" style={{flex:1,padding:'9px 14px',background:'transparent',border:'1px solid rgba(247,243,238,.12)',borderRadius:8,color:'rgba(247,243,238,.5)',cursor:'pointer',fontSize:12,transition:'all .2s'}} onClick={copyPartnerLink}>
                        Copier le lien ↗
                      </button>
                    )}
                  </div>
                  {accessErr&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:'#EF4444',marginTop:2}}>{accessErr}</div>}
                </div>
              )}
            </div>
            {!confirmReject?(
              <div className="adm-modal-actions">
                <button className="adm-sbtn adm-s-pending fb" onClick={()=>updateStatus(sel.id,'pending')}>Pending</button>
                <button className="adm-sbtn adm-s-waiting fb" onClick={()=>updateStatus(sel.id,'en_attente')}>En attente</button>
                <button className="adm-sbtn adm-s-ok fb" disabled={!Object.keys(CATEGORIE_MAP).includes(selCatEdit)} style={{opacity:Object.keys(CATEGORIE_MAP).includes(selCatEdit)?1:.4,cursor:Object.keys(CATEGORIE_MAP).includes(selCatEdit)?'pointer':'not-allowed'}} title={!Object.keys(CATEGORIE_MAP).includes(selCatEdit)?'Modifiez la catégorie avant d\'approuver':''} onClick={async()=>{
                  setAccessErr('');
                  if(!sel.slug){
                    const base=generateSlug(sel.nom);
                    const{data:existing}=await supabase.from('candidates').select('slug').ilike('slug',base+'%').neq('id',sel.id);
                    const slugs=new Set((existing||[]).map(c=>c.slug));
                    let slug=base,i=2;
                    while(slugs.has(slug)){slug=`${base}-${i}`;i++;}
                    await updateStatus(sel.id,'approuve',slug,generateCode());
                  } else {
                    await updateStatus(sel.id,'approuve');
                  }
                }}>Approuver</button>
                <button className="adm-sbtn adm-s-reject fb" onClick={()=>setConfirmReject(true)}>Rejeter</button>
              </div>
            ):(
              <div className="adm-confirm">
                <div className="adm-confirm-txt fb">Êtes-vous sûr de vouloir rejeter cette candidature ? Action irréversible.</div>
                <div className="adm-confirm-row">
                  <button className="adm-confirm-cancel fb" onClick={()=>setConfirmReject(false)}>Annuler</button>
                  <button className="adm-confirm-ok fb" onClick={()=>updateStatus(sel.id,'rejete')}>Confirmer</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selPartner&&(()=>{
        const total=partnerVisits.length;
        const scanned=partnerVisits.filter(v=>v.scanned).length;
        const lastDate=partnerVisits[0]?.created_at;
        const recent=partnerVisits.slice(0,5);
        return(
          <div className="adm-overlay" onClick={e=>{if(e.target===e.currentTarget){setSelPartner(null);setConfirmPDisable(false);}}}>
            <div className="adm-modal">
              <div className="adm-modal-head">
                <div className="adm-modal-title">{selPartner.nom}</div>
                <button className="adm-modal-close fb" onClick={()=>{setSelPartner(null);setConfirmPDisable(false);}}>✕</button>
              </div>
              <div className="adm-modal-body">
                {[
                  ['Catégorie',selPartner.categorie],
                  ['Téléphone',selPartner.telephone],
                  ['Email',selPartner.email],
                  ['Adresse',selPartner.google_maps],
                  ['Réduction',selPartner.reduction],
                ].map(([k,v])=>(
                  <div key={k} className="adm-field">
                    <div className="adm-field-label">{k}</div>
                    <div className="adm-field-val fb">{v||'—'}</div>
                  </div>
                ))}
                <div style={{marginTop:8}}>
                  <div className="adm-section-label">Statistiques</div>
                  {loadingPV?(
                    <div className="adm-empty fb" style={{padding:'16px 0'}}>Chargement…</div>
                  ):(
                    <>
                      <div className="adm-stats-grid">
                        <div className="adm-stat-card">
                          <div className="adm-stat-num fd">{total}</div>
                          <div className="adm-stat-label">QR générés</div>
                        </div>
                        <div className="adm-stat-card">
                          <div className="adm-stat-num fd">{scanned}</div>
                          <div className="adm-stat-label">Scannés</div>
                        </div>
                        <div className="adm-stat-card">
                          <div className="adm-stat-num fd" style={{fontSize:16,paddingTop:6}}>{lastDate?admFmt(lastDate):'—'}</div>
                          <div className="adm-stat-label">Dernière visite</div>
                        </div>
                      </div>
                      {recent.length>0&&(
                        <>
                          <div className="adm-section-label" style={{marginTop:16}}>5 dernières visites</div>
                          <div>
                            {recent.map(v=>(
                              <div key={v.id} className="adm-visit-row">
                                <div>
                                  <div className="adm-visit-name fb">{v.client_name}</div>
                                  <div className="adm-visit-date fb">{admFmt(v.created_at)}</div>
                                </div>
                                {v.scanned
                                  ?<span style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:500,color:'#10B981'}}>✓ Scanné</span>
                                  :<span style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:'rgba(247,243,238,.28)'}}>Non scanné</span>
                                }
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
                <div style={{marginTop:16,borderTop:'1px solid rgba(247,243,238,.07)',paddingTop:16}}>
                  <div className="adm-section-label">Commission</div>
                  <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',marginTop:10}}>
                    <input type="checkbox"
                      checked={selPartner.commission_active||false}
                      onChange={e=>saveCommActive(e.target.checked)}
                      disabled={savingComm}
                    />
                    <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:'rgba(247,243,238,.8)'}}>Commission activée</span>
                    {savingComm&&<span style={{fontSize:11,color:'rgba(247,243,238,.35)'}}>Sauvegarde…</span>}
                    {commSaved&&<span style={{fontSize:11,color:'#10B981'}}>✓ Sauvegardé</span>}
                  </label>
                  {selPartner.commission_active&&(
                    <div style={{marginTop:10,background:'rgba(107,29,29,.12)',border:'1px solid rgba(107,29,29,.25)',borderRadius:8,padding:'10px 12px',fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:300,color:'rgba(247,243,238,.65)',lineHeight:1.6}}>
                      Commission due à Locally : <strong style={{color:'rgba(247,243,238,.85)'}}>5%</strong> — 4% Locally + 1% hôtel d'origine
                    </div>
                  )}
                </div>
                {partnerMessages.length>0&&(
                  <div style={{marginTop:16}}>
                    <div className="adm-section-label">Messages</div>
                    {loadingPM?<div className="adm-empty fb" style={{padding:'12px 0'}}>Chargement…</div>:(
                      <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:8}}>
                        {partnerMessages.map(m=>(
                          <div key={m.id} style={{background:m.status==='non_lu'?'rgba(239,68,68,.06)':'rgba(247,243,238,.03)',border:`1px solid ${m.status==='non_lu'?'rgba(239,68,68,.18)':'rgba(247,243,238,.07)'}`,borderRadius:10,padding:'12px 14px',display:'flex',flexDirection:'column',gap:6}}>
                            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:300,color:'rgba(247,243,238,.8)',lineHeight:1.55}}>{m.message}</div>
                            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                              <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:'rgba(247,243,238,.28)'}}>{admFmt(m.created_at)}</span>
                              {m.status==='non_lu'&&(
                                <button onClick={()=>markAsRead(m.id,selPartner.id)} style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:500,background:'none',border:'1px solid rgba(247,243,238,.15)',borderRadius:6,color:'rgba(247,243,238,.5)',cursor:'pointer',padding:'3px 10px'}}>Marquer comme lu</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {!confirmPDisable?(
                <div className="adm-modal-actions">
                  <button className="adm-sbtn adm-s-reject fb" style={{marginLeft:'auto'}} onClick={()=>setConfirmPDisable(true)}>Désactiver</button>
                </div>
              ):(
                <div className="adm-confirm">
                  <div className="adm-confirm-txt fb">Êtes-vous sûr de vouloir désactiver ce partenaire ? Action irréversible.</div>
                  <div className="adm-confirm-row">
                    <button className="adm-confirm-cancel fb" onClick={()=>setConfirmPDisable(false)}>Annuler</button>
                    <button className="adm-confirm-ok fb" onClick={()=>updateStatus(selPartner.id,'rejete')}>Confirmer</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {selHotel&&(
        <div className="adm-overlay" onClick={e=>{if(e.target===e.currentTarget){setSelHotel(null);setConfirmHotelReject(false);}}}>
          <div className="adm-modal">
            <div className="adm-modal-head">
              <div className="adm-modal-title">{selHotel.nom}</div>
              <button className="adm-modal-close fb" onClick={()=>{setSelHotel(null);setConfirmHotelReject(false);}}>✕</button>
            </div>
            <div className="adm-modal-body">
              {[['Type',selHotel.type],['Adresse',selHotel.adresse],['Responsable',selHotel.nom_responsable],['Email',selHotel.email],['Téléphone',selHotel.telephone],['Chambres',selHotel.nombre_chambres||'—'],['Date',admFmt(selHotel.created_at)]].map(([k,v])=>(
                <div key={k} className="adm-field"><div className="adm-field-label">{k}</div><div className="adm-field-val fb">{v}</div></div>
              ))}
              <div className="adm-field"><div className="adm-field-label">Statut</div><div style={{marginTop:2}}><StatusBadge status={selHotel.status}/></div></div>
              {selHotel.status==='approuve'&&(
                <div style={{borderTop:'1px solid rgba(247,243,238,.07)',paddingTop:16,marginTop:4,display:'flex',flexDirection:'column',gap:12}}>
                  <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:9,fontWeight:500,letterSpacing:'.18em',textTransform:'uppercase',color:'#6B1D1D'}}>Accès hôtel</div>
                  <div className="adm-field"><div className="adm-field-label">Identifiant URL (slug)</div><input className="adm-input fb" value={hotelAccess.slug} onChange={e=>setHotelAccess(a=>({...a,slug:e.target.value}))} placeholder="ex: hotel-des-quais" style={{marginBottom:0}}/></div>
                  <div className="adm-field"><div className="adm-field-label">Code d'accès hôtel</div><input className="adm-input fb" value={hotelAccess.access_code} onChange={e=>setHotelAccess(a=>({...a,access_code:e.target.value}))} placeholder="ex: HOTEL24" style={{marginBottom:0}}/></div>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    <button className="adm-btn fb" style={{flex:1,padding:'9px 14px',fontSize:12}} onClick={saveHotelAccess} disabled={savingHotelAccess}>
                      {savingHotelAccess?'Sauvegarde…':hotelAccessSaved?'✓ Sauvegardé':'Sauvegarder les accès'}
                    </button>
                    {hotelAccess.slug.trim()&&(
                      <button className="fb" style={{flex:1,padding:'9px 14px',background:'transparent',border:'1px solid rgba(247,243,238,.12)',borderRadius:8,color:'rgba(247,243,238,.5)',cursor:'pointer',fontSize:12,transition:'all .2s'}} onClick={()=>navigator.clipboard.writeText(`locally-gules.vercel.app/hotel/${hotelAccess.slug.trim()}`)}>
                        Copier le lien ↗
                      </button>
                    )}
                  </div>
                  {hotelAccessErr&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:'#EF4444',marginTop:2}}>{hotelAccessErr}</div>}
                </div>
              )}
              {hotelMessages.length>0&&(
                <div style={{marginTop:16}}>
                  <div className="adm-section-label">Messages hôtel</div>
                  {loadingHM?<div className="adm-empty fb" style={{padding:'12px 0'}}>Chargement…</div>:(
                    <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:8}}>
                      {hotelMessages.map(m=>(
                        <div key={m.id} style={{background:m.status==='non_lu'?'rgba(239,68,68,.06)':'rgba(247,243,238,.03)',border:`1px solid ${m.status==='non_lu'?'rgba(239,68,68,.18)':'rgba(247,243,238,.07)'}`,borderRadius:10,padding:'12px 14px',display:'flex',flexDirection:'column',gap:6}}>
                          <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:300,color:'rgba(247,243,238,.8)',lineHeight:1.55}}>{m.message}</div>
                          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                            <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:'rgba(247,243,238,.28)'}}>{admFmt(m.created_at)}</span>
                            {m.status==='non_lu'&&(
                              <button onClick={()=>markHotelMsgAsRead(m.id,selHotel.slug)} style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:500,background:'none',border:'1px solid rgba(247,243,238,.15)',borderRadius:6,color:'rgba(247,243,238,.5)',cursor:'pointer',padding:'3px 10px'}}>Marquer comme lu</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {!confirmHotelReject?(
              <div className="adm-modal-actions">
                <button className="adm-sbtn adm-s-pending fb" onClick={()=>updateHotelStatus(selHotel.id,'pending')}>Pending</button>
                <button className="adm-sbtn adm-s-waiting fb" onClick={()=>updateHotelStatus(selHotel.id,'en_attente')}>En attente</button>
                <button className="adm-sbtn adm-s-ok fb" onClick={async()=>{
                  setHotelAccessErr('');
                  if(!selHotel.slug){
                    const base=generateSlug(selHotel.nom);
                    const{data:existing}=await supabase.from('hotels').select('slug').ilike('slug',base+'%').neq('id',selHotel.id);
                    const slugs=new Set((existing||[]).map(h=>h.slug));
                    let slug=base,i=2;
                    while(slugs.has(slug)){slug=`${base}-${i}`;i++;}
                    await updateHotelStatus(selHotel.id,'approuve',slug,generateCode());
                  } else {
                    await updateHotelStatus(selHotel.id,'approuve');
                  }
                }}>Approuver</button>
                <button className="adm-sbtn adm-s-reject fb" onClick={()=>setConfirmHotelReject(true)}>Rejeter</button>
              </div>
            ):(
              <div className="adm-confirm">
                <div className="adm-confirm-txt fb">Êtes-vous sûr de vouloir rejeter cet hôtel ? Action irréversible.</div>
                <div className="adm-confirm-row">
                  <button className="adm-confirm-cancel fb" onClick={()=>setConfirmHotelReject(false)}>Annuler</button>
                  <button className="adm-confirm-ok fb" onClick={()=>updateHotelStatus(selHotel.id,'rejete')}>Confirmer</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function toBase64(file){
  return new Promise(res=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.readAsDataURL(file);});
}

function parseReduction(r){
  if(!r)return 0;
  const m=String(r).match(/(\d+(?:\.\d+)?)/);
  return m?parseFloat(m[1]):0;
}

function BarChart({data}){
  const max=Math.max(...data.map(d=>d.ca),0.01);
  const hasData=data.some(d=>d.ca>0);
  const W=600,H=150,PT=10,PR=8,PB=30,PL=42;
  const innerW=W-PL-PR,innerH=H-PT-PB;
  const bW=innerW/data.length;
  if(!hasData)return(
    <div style={{height:150,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:300,color:'#9B8B7A'}}>
      Pas encore de transactions sur cette période
    </div>
  );
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block'}}>
      {[0,0.5,1].map(f=>{
        const y=PT+innerH*(1-f);
        return(
          <g key={f}>
            <line x1={PL} x2={W-PR} y1={y} y2={y} stroke="rgba(107,29,29,.08)" strokeWidth={1}/>
            <text x={PL-5} y={y+4} textAnchor="end" fontSize={9} fill="#9B8B7A" fontFamily="DM Sans,sans-serif">{f===0?'0':(max*f).toFixed(0)+'€'}</text>
          </g>
        );
      })}
      {data.map((d,i)=>{
        const bH=Math.max((d.ca/max)*innerH,d.ca>0?1:0);
        const x=PL+i*bW+bW*0.18;
        const y=PT+innerH-bH;
        const lbl=d.date.slice(5).replace('-','/');
        return(
          <g key={d.date}>
            <rect x={x} y={y} width={bW*0.64} height={bH} fill={d.ca>0?'#6B1D1D':'transparent'} rx={2}/>
            {i%5===0&&<text x={PL+i*bW+bW/2} y={H-4} textAnchor="middle" fontSize={8} fill="#9B8B7A" fontFamily="DM Sans,sans-serif">{lbl}</text>}
          </g>
        );
      })}
    </svg>
  );
}

function PartnerView({onLogout}){
  const slug=window.location.pathname.replace(/^\/partner\//,'').split('/')[0];
  const [authed,setAuthed]=useState(()=>localStorage.getItem('partner_slug')===slug);
  const [partner,setPartner]=useState(null);
  const [code,setCode]=useState('');
  const [loginErr,setLoginErr]=useState('');
  const [loginLoading,setLoginLoading]=useState(false);
  const [tab,setTab]=useState('profil');
  const [partnerForm,setPartnerForm]=useState({nom:'',description:'',reduction:'',telephone:'',google_maps:'',email:'',google_review_url:'',site_web:''});
  const [savingProfile,setSavingProfile]=useState(false);
  const [profileSaved,setProfileSaved]=useState(false);
  const [profileErr,setProfileErr]=useState('');
  const [reductionErr,setReductionErr]=useState('');
  const [menuItems,setMenuItems]=useState([]);
  const [loadingMenu,setLoadingMenu]=useState(false);
  const [menuForm,setMenuForm]=useState(null);
  const [savingMenu,setSavingMenu]=useState(false);
  const [menuErr,setMenuErr]=useState('');
  const [deletingId,setDeletingId]=useState(null);
  const [statVisits,setStatVisits]=useState([]);
  const [pageViews,setPageViews]=useState(0);
  const [statCA,setStatCA]=useState(0);
  const [loadingStats,setLoadingStats]=useState(false);
  const [statPeriod,setStatPeriod]=useState('month');
  const [statPrev,setStatPrev]=useState({visits:0,scanned:0,pageViews:0,ca:0});
  const [chartData,setChartData]=useState([]);
  const [recentTxns,setRecentTxns]=useState([]);
  const [reviewClicks,setReviewClicks]=useState(0);
  const [horaires,setHoraires]=useState({});
  const [msgText,setMsgText]=useState('');
  const [partnerTags,setPartnerTags]=useState([]);
  const [savingTags,setSavingTags]=useState(false);
  const [tagsSaved,setTagsSaved]=useState(false);
  const [tagsErr,setTagsErr]=useState('');
  const [horaireOpen,setHoraireOpen]=useState(false);
  const [savingHoraires,setSavingHoraires]=useState(false);
  const [horairesSaved,setHorairesSaved]=useState(false);
  const [horairesErr,setHorairesErr]=useState('');
  const [sendingMsg,setSendingMsg]=useState(false);
  const [msgSent,setMsgSent]=useState(false);
  const [msgErr,setMsgErr]=useState('');
  const [txnStep,setTxnStep]=useState('scan');
  const [txnScanMode,setTxnScanMode]=useState('camera');
  const [txnManualId,setTxnManualId]=useState('');
  const [txnVisit,setTxnVisit]=useState(null);
  const [txnScanErr,setTxnScanErr]=useState('');
  const [txnMontant,setTxnMontant]=useState('');
  const [txnTaux,setTxnTaux]=useState('');
  const [txnSaving,setTxnSaving]=useState(false);
  const [txnErr,setTxnErr]=useState('');
  const txnQrRef=useRef(null);
  const prtQrCardRef=useRef(null);
  const cameraActiveRef=useRef(false);
  const [savingInfo,setSavingInfo]=useState(false);
  const [infoSaved,setInfoSaved]=useState(false);
  const [infoErr,setInfoErr]=useState('');
  const [settingsCodeForm,setSettingsCodeForm]=useState({code1:'',code2:''});
  const [savingSettingsCode,setSavingSettingsCode]=useState(false);
  const [settingsCodeErr,setSettingsCodeErr]=useState('');
  const [settingsCodeSaved,setSettingsCodeSaved]=useState(false);
  const [savingVisible,setSavingVisible]=useState(false);

  async function loadPartner(){
    try{
      const{data,error}=await supabase.from('candidates').select('*').ilike('slug',slug).eq('status','approuve').maybeSingle();
      if(error)throw error;
      if(data){
        setPartner(data);
        setPartnerForm({nom:data.nom||'',description:data.description||'',reduction:data.reduction||'',telephone:data.telephone||'',google_maps:data.google_maps||'',email:data.email||'',google_review_url:data.google_review_url||'',site_web:data.site_web||''});
        setPartnerTags(data.tags||[]);
        setHoraires(data.horaires||{});
      }
    }catch(e){console.error('loadPartner:',e);}
  }
  useEffect(()=>{if(authed)loadPartner();},[]);

  async function saveSettingsInfo(){
    setSavingInfo(true);setInfoErr('');setReductionErr('');
    if(partnerForm.reduction.trim()){
      const rv=parseReduction(partnerForm.reduction);
      if(rv===0||rv<10){setReductionErr('La réduction minimum est de 10%.');setSavingInfo(false);return;}
      if(rv>50){setReductionErr('La réduction maximum est de 50%.');setSavingInfo(false);return;}
    }
    try{
      const payload={nom:partnerForm.nom.trim(),telephone:partnerForm.telephone.trim(),email:partnerForm.email.trim(),google_maps:partnerForm.google_maps.trim(),reduction:partnerForm.reduction,description:partnerForm.description.trim(),google_review_url:partnerForm.google_review_url.trim(),site_web:partnerForm.site_web.trim()||null};
      const{error}=await supabase.from('candidates').update(payload).eq('id',partner.id);
      if(error)throw error;
      setPartner(p=>({...p,...payload}));
      setInfoSaved(true);setTimeout(()=>setInfoSaved(false),3000);
    }catch(e){setInfoErr('Erreur lors de la sauvegarde. Réessayez.');}
    setSavingInfo(false);
  }

  async function saveHoraires(){
    setSavingHoraires(true);setHorairesErr('');
    try{
      const{error}=await supabase.from('candidates').update({horaires}).eq('id',partner.id);
      if(error)throw error;
      setPartner(p=>({...p,horaires}));
      setHorairesSaved(true);setTimeout(()=>setHorairesSaved(false),2500);
    }catch(e){setHorairesErr('Erreur lors de la sauvegarde. Réessayez.');}
    setSavingHoraires(false);
  }

  async function saveSettingsTags(){
    setSavingTags(true);setTagsErr('');
    const{error}=await supabase.from('candidates').update({tags:partnerTags}).eq('id',partner.id);
    setSavingTags(false);
    if(error){setTagsErr('Erreur : '+error.message);return;}
    setPartner(p=>({...p,tags:partnerTags}));
    setTagsSaved(true);setTimeout(()=>setTagsSaved(false),2500);
  }

  async function saveSettingsCode(){
    setSettingsCodeErr('');
    if(settingsCodeForm.code1.length<6){setSettingsCodeErr('Le code doit contenir au moins 6 caractères.');return;}
    if(settingsCodeForm.code1!==settingsCodeForm.code2){setSettingsCodeErr('Les codes ne correspondent pas.');return;}
    setSavingSettingsCode(true);
    try{
      const{error}=await supabase.from('candidates').update({access_code:settingsCodeForm.code1}).eq('id',partner.id);
      if(error)throw error;
      setSettingsCodeSaved(true);setTimeout(()=>setSettingsCodeSaved(false),3000);
      setSettingsCodeForm({code1:'',code2:''});
    }catch(e){setSettingsCodeErr('Erreur lors de la mise à jour. Réessayez.');}
    setSavingSettingsCode(false);
  }

  async function toggleVisible(){
    setSavingVisible(true);
    const newVal=partner.visible===false?true:false;
    try{
      const{error}=await supabase.from('candidates').update({visible:newVal}).eq('id',partner.id);
      if(error)throw error;
      setPartner(p=>({...p,visible:newVal}));
    }catch(e){console.error('toggleVisible:',e);}
    setSavingVisible(false);
  }

  async function fetchStatsExtra(){
    try{
      const from30=new Date(Date.now()-30*24*60*60*1000).toISOString();
      const [{data:txn30},{data:last5},{count:rcCount}]=await Promise.all([
        supabase.from('transactions').select('created_at,montant_client').eq('partner_id',partner.id).gte('created_at',from30),
        supabase.from('transactions').select('created_at,montant_client,taux_reduction_applique').eq('partner_id',partner.id).order('created_at',{ascending:false}).limit(5),
        supabase.from('review_clicks').select('*',{count:'exact',head:true}).eq('partner_id',partner.id),
      ]);
      setReviewClicks(rcCount||0);
      const byDay={};
      for(let i=29;i>=0;i--){
        const d=new Date();d.setDate(d.getDate()-i);
        byDay[d.toISOString().slice(0,10)]=0;
      }
      (txn30||[]).forEach(t=>{const k=t.created_at.slice(0,10);if(byDay[k]!==undefined)byDay[k]+=Number(t.montant_client||0);});
      setChartData(Object.entries(byDay).map(([date,ca])=>({date,ca})));
      setRecentTxns(last5||[]);
    }catch(e){console.error('fetchStatsExtra:',e);}
  }

  useEffect(()=>{
    if(!partner)return;
    if(tab==='menu')fetchMenu();
    else if(tab==='stats'){fetchStats(statPeriod);fetchStatsExtra();}
  },[tab,partner]);
  useEffect(()=>{
    if(tab==='stats'&&partner)fetchStats(statPeriod);
  },[statPeriod]);

  useEffect(()=>{
    if(tab!=='valider'||txnStep!=='scan'||txnScanMode!=='camera')return;
    if(cameraActiveRef.current)return;
    cameraActiveRef.current=true;
    const qr=new Html5Qrcode('txn-qr-reader');
    txnQrRef.current=qr;
    qr.start({facingMode:'environment'},{fps:10,qrbox:{width:240,height:240}},
      async(decoded)=>{try{await qr.stop();}catch(e){}cameraActiveRef.current=false;await txnVerifyQR(decoded);},
      ()=>{}
    ).catch(err=>{console.error('TxnCamera:',err);cameraActiveRef.current=false;});
    return()=>{cameraActiveRef.current=false;try{if(qr.isScanning)qr.stop().catch(()=>{});}catch(e){}};
  },[tab,txnStep,txnScanMode]);

  async function txnVerifyQR(raw){
    if(!partner)return;
    let qrId=raw.trim();
    try{const u=new URL(raw);const p=u.searchParams.get('id');if(p)qrId=p;}catch(e){}
    setTxnScanErr('');
    try{
      const{data:visit,error}=await supabase.from('visits').select('*').eq('qr_code_id',qrId).maybeSingle();
      if(error)throw error;
      if(!visit){setTxnScanErr('QR code introuvable.');return;}
      if(new Date(visit.expires_at)<new Date()){setTxnScanErr('QR code expiré, le client peut en générer un nouveau gratuitement.');return;}
      if(visit.partner_id!==partner.id){setTxnScanErr("Ce QR code n'est pas destiné à votre établissement.");return;}
      setTxnVisit(visit);
      setTxnTaux(String(parseReduction(partner.reduction)));
      setTxnStep('amount');
    }catch(e){setTxnScanErr('Erreur lors de la vérification. Réessayez.');}
  }

  async function txnConfirm(){
    if(!partner||!txnVisit)return;
    const m=parseFloat(txnMontant),t=parseFloat(txnTaux);
    if(isNaN(m)||m<=0||isNaN(t)||t<=0){setTxnErr('Montant ou taux invalide.');return;}
    setTxnSaving(true);setTxnErr('');
    try{
      const commActive=partner.commission_active===true;
      const montant_reduction=+(m*t/100).toFixed(2);
      const commission_locally=commActive ? +(m*0.04).toFixed(2) : 0;
      const commission_hotel=commActive&&txnVisit.hotel_slug ? +(m*0.01).toFixed(2) : 0;
      const montant_client=commActive ? +(m-m*(t-5)/100).toFixed(2) : +(m-montant_reduction).toFixed(2);
      const{error}=await supabase.from('transactions').insert([{
        visit_id:txnVisit.id,
        qr_code_id:txnVisit.qr_code_id,
        partner_id:partner.id,
        client_name:txnVisit.client_name,
        user_id:txnVisit.user_id||null,
        hotel_slug:txnVisit.hotel_slug||null,
        montant_transaction:m,
        taux_reduction_applique:t,
        montant_reduction,
        commission_locally,
        commission_hotel,
        montant_client,
      }]);
      if(error)throw error;
      if(!txnVisit.scanned){
        await supabase.from('visits').update({scanned:true,scanned_at:new Date().toISOString()}).eq('id',txnVisit.id);
      }
      setTxnStep('done');
    }catch(e){setTxnErr('Erreur lors de l\'enregistrement. Réessayez.');}
    setTxnSaving(false);
  }

  function txnReset(){
    setTxnStep('scan');setTxnScanMode('camera');setTxnManualId('');
    setTxnVisit(null);setTxnScanErr('');setTxnMontant('');setTxnTaux('');
  }

  async function handleLogin(e){
    e.preventDefault();setLoginLoading(true);setLoginErr('');
    const{data}=await supabase.from('candidates').select('*').eq('slug',slug).eq('access_code',code.trim()).eq('status','approuve').maybeSingle();
    if(data){
      localStorage.setItem('partner_slug',slug);
      setPartner(data);
      setPartnerForm({nom:data.nom||'',description:data.description||'',reduction:data.reduction||'',telephone:data.telephone||'',google_maps:data.google_maps||'',email:data.email||'',google_review_url:data.google_review_url||'',site_web:data.site_web||''});
      setPartnerTags(data.tags||[]);
      setHoraires(data.horaires||{});
      setAuthed(true);
    }else{
      setLoginErr('Code incorrect ou accès non autorisé.');
    }
    setLoginLoading(false);
  }

  function setDay(day,key,val){setHoraires(h=>{const d=h[day]||{ouvert:false,creneaux:[["",""]]};const cr=Array.isArray(d.creneaux)?d.creneaux:[["",""]];return{...h,[day]:{...d,creneaux:cr,[key]:val}};});}
  function setDayTime(day,si,ti,val){setHoraires(h=>{const d={...(h[day]||{ouvert:false,creneaux:[["",""]]})};const cr=(Array.isArray(d.creneaux)?d.creneaux:[["",""]]).map((s,i)=>i===si?s.map((t,j)=>j===ti?val:t):s);return{...h,[day]:{...d,creneaux:cr}};});}
  function addDaySlot(day){setHoraires(h=>{const d={...(h[day]||{ouvert:false,creneaux:[["",""]]})};const cr=Array.isArray(d.creneaux)?d.creneaux:[["",""]];if(cr.length>=2)return h;return{...h,[day]:{...d,creneaux:[...cr,["",""]]}};});}
  function removeDaySlot(day){setHoraires(h=>{const d={...(h[day]||{ouvert:false,creneaux:[["",""]]})};const cr=Array.isArray(d.creneaux)?d.creneaux:[["",""]];return{...h,[day]:{...d,creneaux:cr.slice(0,1)}};});}

  async function downloadPrtQrCard(){
    if(!prtQrCardRef.current)return;
    const canvas=await html2canvas(prtQrCardRef.current,{scale:3,useCORS:true,backgroundColor:'#ffffff'});
    const link=document.createElement('a');
    link.download=`locally-acces-${slug}.png`;
    link.href=canvas.toDataURL('image/png');
    link.click();
  }
  async function handlePhotoUpload(e){
    const file=e.target.files[0];if(!file)return;
    const b64=await toBase64(file);
    await supabase.from('candidates').update({photo_url:b64}).eq('id',partner.id);
    setPartner(p=>({...p,photo_url:b64}));
  }

  async function sendMessage(){
    if(!msgText.trim())return;
    setSendingMsg(true);setMsgErr('');
    try{
      const{error}=await supabase.from('messages').insert({partner_id:partner.id,partner_name:partner.nom,message:msgText.trim()});
      if(error)throw error;
      setMsgText('');setMsgSent(true);setTimeout(()=>setMsgSent(false),3000);
    }catch(e){setMsgErr('Erreur lors de l\'envoi. Réessayez.');}
    setSendingMsg(false);
  }
  async function fetchMenu(){
    setLoadingMenu(true);
    const{data}=await supabase.from('menu_items').select('*').eq('partner_id',partner.id).order('created_at',{ascending:false});
    setMenuItems(data||[]);setLoadingMenu(false);
  }

  function getPeriodRange(period){
    const n=new Date();
    let from,prevFrom,prevTo;
    if(period==='today'){
      from=new Date(n.getFullYear(),n.getMonth(),n.getDate()).toISOString();
      prevFrom=new Date(n.getFullYear(),n.getMonth(),n.getDate()-1).toISOString();
      prevTo=from;
    }else if(period==='week'){
      const d=n.getDay()||7;
      from=new Date(n.getFullYear(),n.getMonth(),n.getDate()-d+1).toISOString();
      prevFrom=new Date(n.getFullYear(),n.getMonth(),n.getDate()-d+1-7).toISOString();
      prevTo=from;
    }else if(period==='month'){
      from=new Date(n.getFullYear(),n.getMonth(),1).toISOString();
      prevFrom=new Date(n.getFullYear(),n.getMonth()-1,1).toISOString();
      prevTo=from;
    }else{
      from=new Date(n.getFullYear(),0,1).toISOString();
      prevFrom=new Date(n.getFullYear()-1,0,1).toISOString();
      prevTo=from;
    }
    return{from,prevFrom,prevTo};
  }

  async function fetchStats(period='month'){
    setLoadingStats(true);
    try{
      const{from,prevFrom,prevTo}=getPeriodRange(period);
      const[
        {data:vData},{count:pvCount},{data:txnData},
        {data:vPrev},{count:pvPrev},{data:txnPrev}
      ]=await Promise.all([
        supabase.from('visits').select('*').eq('partner_id',partner.id).gte('created_at',from),
        supabase.from('page_views').select('*',{count:'exact',head:true}).eq('partner_id',partner.id).gte('created_at',from),
        supabase.from('transactions').select('montant_client').eq('partner_id',partner.id).gte('created_at',from),
        supabase.from('visits').select('scanned').eq('partner_id',partner.id).gte('created_at',prevFrom).lt('created_at',prevTo),
        supabase.from('page_views').select('*',{count:'exact',head:true}).eq('partner_id',partner.id).gte('created_at',prevFrom).lt('created_at',prevTo),
        supabase.from('transactions').select('montant_client').eq('partner_id',partner.id).gte('created_at',prevFrom).lt('created_at',prevTo),
      ]);
      setStatVisits(vData||[]);
      setPageViews(pvCount||0);
      setStatCA((txnData||[]).reduce((s,t)=>s+Number(t.montant_client||0),0));
      setStatPrev({
        visits:(vPrev||[]).length,
        scanned:(vPrev||[]).filter(v=>v.scanned).length,
        pageViews:pvPrev||0,
        ca:(txnPrev||[]).reduce((s,t)=>s+Number(t.montant_client||0),0),
      });
    }catch(e){console.error('fetchStats:',e);}
    setLoadingStats(false);
  }

  async function saveMenuItem(){
    if(!menuForm.nom||!menuForm.prix)return;
    setSavingMenu(true);setMenuErr('');
    try{
      const payload={nom:menuForm.nom,description:menuForm.description||null,prix:parseFloat(menuForm.prix),photo_url:menuForm.photo_url||null,duree:menuForm.duree||null};
      const q=menuForm.id
        ?supabase.from('menu_items').update(payload).eq('id',menuForm.id)
        :supabase.from('menu_items').insert([{...payload,partner_id:partner.id}]);
      const{error}=await q;
      if(error)throw error;
      setMenuForm(null);await fetchMenu();
    }catch(e){setMenuErr('Erreur lors de la sauvegarde. Réessayez.');}
    setSavingMenu(false);
  }

  async function deleteMenuItem(id){
    try{
      const{error}=await supabase.from('menu_items').delete().eq('id',id);
      if(error)throw error;
      setMenuItems(ms=>ms.filter(m=>m.id!==id));
    }catch(e){setMenuErr('Erreur lors de la suppression. Réessayez.');}
    setDeletingId(null);
  }

  async function handleMenuPhoto(e){
    const file=e.target.files[0];if(!file)return;
    const b64=await toBase64(file);
    setMenuForm(f=>({...f,photo_url:b64}));
  }

  function logout(){localStorage.removeItem('partner_slug');onLogout();}

  const pFmt=d=>d?new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'}):'—';

  if(!authed) return(
    <div className="prt-login-wrap">
      <style>{CSS}</style>
      <div className="prt-login">
        <div className="prt-logo fd">local<em>ly</em></div>
        <div className="prt-login-title fd">Espace partenaire</div>
        <div className="prt-login-sub fb">Entrez votre code d'accès pour accéder à votre espace.</div>
        <form onSubmit={handleLogin}>
          <input className="prt-input fb" type="password" placeholder="Code d'accès" value={code} onChange={e=>{setCode(e.target.value);setLoginErr('');}} autoFocus style={{marginBottom:10}}/>
          {loginErr&&<div className="prt-err fb">{loginErr}</div>}
          <button type="submit" className="prt-btn-primary fb" style={{width:'100%'}} disabled={loginLoading}>
            {loginLoading?'Vérification…':'Accéder →'}
          </button>
        </form>
      </div>
    </div>
  );

  if(!partner) return(
    <div style={{minHeight:'100dvh',background:'#F7F3EE',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <style>{CSS}</style>
      <div className="prt-loading fb">Chargement…</div>
    </div>
  );

  const totalV=statVisits.length;
  const scannedV=statVisits.filter(v=>v.scanned).length;

  // Completion score
  const cpHasPhoto=!!partner?.photo_url;
  const cpHasDesc=(partnerForm.description||'').trim().length>=20;
  const cpHasTags=partnerTags.length>=1;
  const cpHasHoraires=Object.values(horaires).some(h=>h?.ouvert);
  const cpHasSite=!!(partnerForm.site_web||'').trim();
  const cpHasMenu=menuItems.length>=1;
  const completionScore=(cpHasPhoto?25:0)+(cpHasDesc?25:0)+(cpHasTags?15:0)+(cpHasHoraires?15:0)+(cpHasSite?10:0)+(cpHasMenu?10:0);
  const canPublish=cpHasPhoto&&cpHasDesc;

  return(
    <div className="prt-wrap">
      <style>{CSS}</style>
      <div className="prt-header">
        <div className="prt-logo-sm fd">local<em>ly</em></div>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <div className="prt-partner-name fb">{partner.nom}</div>
          <button className="prt-deconnect fb" onClick={logout}>Déconnexion</button>
        </div>
      </div>
      <div className="prt-tabs-bar">
        {[['profil','Mon profil'],['menu',getMetierLabels(partner?.categorie).ongletLabel],['messages','Messages'],['stats','Mes stats'],['valider','Valider'],['parametres','Paramètres']].map(([v,l])=>(
          <button key={v} className={'prt-tab fb'+(tab===v?' act':'')} onClick={()=>setTab(v)}>{l}</button>
        ))}
      </div>
      <div className="prt-content">

        {tab==='profil'&&(
          <>
            {/* ── COMPLETION ── */}
            {(()=>{
              const offreLabel=getMetierLabels(partner?.categorie).ongletLabel.replace(/^(Mon |Mes )/,'');
              const items=[
                {label:'Photo principale',ok:cpHasPhoto,req:true},
                {label:'Description',ok:cpHasDesc,req:true},
                {label:'Tags / spécialités',ok:cpHasTags,req:false},
                {label:"Horaires d'ouverture",ok:cpHasHoraires,req:false},
                {label:'Site web',ok:cpHasSite,req:false},
                {label:offreLabel+' en ligne',ok:cpHasMenu,req:false},
              ];
              return(
                <div style={{background:'#FBF7F3',border:'1px solid #E8DDD0',borderRadius:14,padding:'18px 20px',marginBottom:24}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                    <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,color:'#1C1208'}}>Profil complété à {completionScore}%</span>
                    {completionScore<50&&<span style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:400,color:'#9B8B7A'}}>Complétez votre profil pour attirer plus de clients</span>}
                  </div>
                  <div style={{background:'#F0E8DE',borderRadius:999,height:7,overflow:'hidden',marginBottom:16}}>
                    <div style={{background:'#6B1D1D',height:'100%',width:`${completionScore}%`,borderRadius:999,transition:'width .4s ease'}}/>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {items.map(({label,ok,req})=>(
                      <div key={label} style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:13,color:ok?'#2D6A4F':'#C8B8A8',flexShrink:0,lineHeight:1}}>{ok?'✓':'○'}</span>
                        <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:ok?500:400,color:ok?'#3D3028':'#9B8B7A'}}>
                          {label}{req&&<span style={{color:'#B91C1C',marginLeft:2}}>*</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ── PHOTO ── */}
            <div className="prt-photo-section">
              <div className="prt-section-label fb">Photo principale</div>
              <div className="prt-photo-area">
                {partner.photo_url
                  ?<img src={partner.photo_url} className="prt-photo-preview" alt=""/>
                  :<div className="prt-photo-placeholder fb">Aucune photo</div>
                }
                <label className="prt-photo-btn fb">
                  {partner.photo_url?'Changer la photo':'Ajouter une photo'}
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{display:'none'}}/>
                </label>
              </div>
            </div>

            {/* ── INFOS DE BASE ── */}
            <div className="prt-form">
              {[
                ['nom',"Nom de l'établissement",'text','Le Café du Marché'],
                ['telephone','Téléphone','text','06 00 00 00 00'],
                ['email','Email','email','contact@exemple.fr'],
                ['google_maps','Adresse','text','12 Rue de la Paix, Bordeaux'],
              ].map(([name,label,type,ph])=>(
                <div key={name} className="prt-field">
                  <div className="prt-label fb">{label}</div>
                  <input className="prt-input fb" type={type} value={partnerForm[name]||''} onChange={e=>setPartnerForm(f=>({...f,[name]:e.target.value}))} placeholder={ph}/>
                </div>
              ))}
              <div className="prt-field">
                <div className="prt-label fb">Réduction proposée <span style={{fontWeight:300,color:'#9B8B7A',fontSize:11}}>(min. 10%, max. 50%)</span></div>
                <input className="prt-input fb" type="text" value={partnerForm.reduction||''} onChange={e=>{setPartnerForm(f=>({...f,reduction:e.target.value}));setReductionErr('');}} placeholder="10% sur tous les achats"/>
                {reductionErr&&<div className="prt-err fb" style={{marginTop:6,fontSize:12}}>{reductionErr}</div>}
                {partner.commission_active===true&&parseReduction(partnerForm.reduction)>=10&&(
                  <div style={{marginTop:8,fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:400,color:'#6B1D1D',background:'rgba(107,29,29,.06)',border:'1px solid rgba(107,29,29,.12)',borderRadius:8,padding:'10px 12px',lineHeight:1.6}}>
                    Commission Locally activée · <strong>{parseReduction(partnerForm.reduction)-5}%</strong> pour vos clients · <strong>5%</strong> pour Locally
                  </div>
                )}
              </div>
              <div className="prt-field">
                <div className="prt-label fb">Description</div>
                <textarea className="prt-textarea fb" value={partnerForm.description||''} onChange={e=>setPartnerForm(f=>({...f,description:e.target.value}))} placeholder="Décrivez votre établissement…"/>
              </div>
              <div className="prt-field">
                <div className="prt-label fb">Site web</div>
                <input className="prt-input fb" type="url" value={partnerForm.site_web||''} onChange={e=>setPartnerForm(f=>({...f,site_web:e.target.value}))} placeholder="https://…"/>
              </div>
              <div className="prt-field">
                <div className="prt-label fb">Lien Google Avis</div>
                <input className="prt-input fb" type="url" value={partnerForm.google_review_url||''} onChange={e=>setPartnerForm(f=>({...f,google_review_url:e.target.value}))} placeholder="https://g.page/r/…"/>
              </div>
              {infoErr&&<div className="prt-err fb">{infoErr}</div>}
              <div>
                <button className="prt-btn-primary fb" onClick={saveSettingsInfo} disabled={savingInfo||!partnerForm.nom.trim()}>
                  {savingInfo?'Sauvegarde…':infoSaved?'✓ Sauvegardé':'Sauvegarder'}
                </button>
              </div>
            </div>

            {/* ── VOS SPÉCIALITÉS ── */}
            {(TAGS_PAR_CATEGORIE[partner?.categorie]||[]).length>0&&(
              <div style={{borderTop:'1px solid rgba(107,29,29,.1)',paddingTop:28,marginTop:4}}>
                <div className="prt-section-label fb">Vos spécialités</div>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:'#9B8B7A',marginBottom:14}}>Sélectionnez jusqu'à 5 tags qui décrivent votre établissement.</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                  {(TAGS_PAR_CATEGORIE[partner?.categorie]||[]).map(t=>{
                    const checked=partnerTags.includes(t);
                    const disabled=!checked&&partnerTags.length>=5;
                    return(
                      <button key={t} onClick={()=>{if(disabled)return;setPartnerTags(ts=>ts.includes(t)?ts.filter(x=>x!==t):[...ts,t]);}} style={{
                        display:'flex',alignItems:'center',gap:8,textAlign:'left',
                        padding:'10px 14px',borderRadius:12,fontSize:13,
                        fontFamily:"'DM Sans',sans-serif",fontWeight:500,
                        cursor:disabled?'not-allowed':'pointer',
                        border:'1.5px solid',
                        borderColor:checked?'#6B1D1D':'#E8DDD0',
                        background:checked?'#6B1D1D':'#ffffff',
                        color:checked?'#FAF4EC':disabled?'rgba(122,101,85,.35)':'#7A6555',
                        boxShadow:checked?'0 2px 8px rgba(107,29,29,.18)':'none',
                        transition:'all .15s',
                      }}>
                        <span style={{fontSize:16,flexShrink:0}}>{TAG_ICONS[t]||'•'}</span>
                        <span>{t}</span>
                      </button>
                    );
                  })}
                </div>
                <div style={{textAlign:'right',fontFamily:"'DM Sans',sans-serif",fontSize:12,color:'#9B8B7A',marginBottom:16}}>
                  {partnerTags.length}/5 sélectionnés
                </div>
                {tagsErr&&<div className="prt-err fb">{tagsErr}</div>}
                <button onClick={saveSettingsTags} disabled={savingTags} style={{
                  fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:500,
                  background:'transparent',color:'#6B1D1D',
                  border:'1.5px solid #6B1D1D',borderRadius:9,
                  padding:'11px 22px',cursor:savingTags?'not-allowed':'pointer',letterSpacing:'.015em',
                  opacity:savingTags?.6:1,
                }}>
                  {tagsSaved?'✓ Sauvegardé':savingTags?'Sauvegarde…':'Sauvegarder les spécialités'}
                </button>
              </div>
            )}

            {/* ── HORAIRES (ACCORDÉON) ── */}
            <div style={{borderTop:'1px solid rgba(107,29,29,.1)',paddingTop:28,marginTop:4}}>
              <button type="button" onClick={()=>setHoraireOpen(o=>!o)} style={{
                display:'flex',alignItems:'center',gap:8,background:'none',border:'none',cursor:'pointer',padding:0,width:'100%',marginBottom:horaireOpen?16:0,
              }}>
                <span className="prt-section-label fb" style={{margin:0,flex:1,textAlign:'left'}}>Horaires d'ouverture</span>
                <span style={{fontSize:20,color:'#6B1D1D',lineHeight:1,display:'block',transform:horaireOpen?'rotate(180deg)':'none',transition:'transform .2s'}}>▾</span>
              </button>
              {horaireOpen&&(
                <>
                  <div className="prt-hours-grid">
                    {DAYS.map(day=>{
                      const h=horaires[day]||{ouvert:false,creneaux:[["",""]]};
                      const cr=Array.isArray(h.creneaux)&&h.creneaux.length?h.creneaux:[["",""]];
                      return(
                        <div key={day} className="prt-hours-row" style={{alignItems:'flex-start'}}>
                          <div className="prt-hours-day-name fb" style={{paddingTop:6}}>{day}</div>
                          <div className="prt-hours-toggle" style={{flexShrink:0,paddingTop:4}}>
                            <button type="button" className={'prt-hours-toggle-btn fb'+(h.ouvert?' on':'')} onClick={()=>setDay(day,'ouvert',true)}>Ouvert</button>
                            <button type="button" className={'prt-hours-toggle-btn fb'+(!h.ouvert?' on':'')} onClick={()=>setDay(day,'ouvert',false)}>Fermé</button>
                          </div>
                          {h.ouvert&&(
                            <div className="prt-hours-slots">
                              {cr.map((slot,si)=>(
                                <div key={si} className="prt-hours-slot-row">
                                  <input className="prt-hours-time fb" type="time" value={slot[0]||''} onChange={e=>setDayTime(day,si,0,e.target.value)}/>
                                  <span className="prt-hours-time-sep fb">→</span>
                                  <input className="prt-hours-time fb" type="time" value={slot[1]||''} onChange={e=>setDayTime(day,si,1,e.target.value)}/>
                                  {si===0&&cr.length<2&&<button type="button" className="prt-hours-slot-add fb" onClick={()=>addDaySlot(day)}>+ 2ème créneau</button>}
                                  {si>0&&<button type="button" className="prt-hours-slot-rm" onClick={()=>removeDaySlot(day)}>×</button>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {horairesErr&&<div className="prt-err fb" style={{marginTop:12}}>{horairesErr}</div>}
                  <div style={{marginTop:16}}>
                    <button onClick={saveHoraires} disabled={savingHoraires} style={{
                      fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:500,
                      background:'transparent',color:'#6B1D1D',
                      border:'1.5px solid #6B1D1D',borderRadius:9,
                      padding:'11px 22px',cursor:savingHoraires?'not-allowed':'pointer',letterSpacing:'.015em',
                      opacity:savingHoraires?.6:1,
                    }}>
                      {horairesSaved?'✓ Sauvegardé':savingHoraires?'Sauvegarde…':'Sauvegarder les horaires'}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* ── QR COMPTOIR ── */}
            <div style={{borderTop:'1px solid rgba(107,29,29,.1)',paddingTop:28,marginTop:4}}>
              <div className="prt-section-label fb">QR code comptoir</div>
              <div style={{marginBottom:14,fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:300,color:'#7A6555',lineHeight:1.6}}>
                Imprimez cette carte et posez-la en caisse. En la scannant, vous arrivez directement sur votre page de connexion.
              </div>
              <div ref={prtQrCardRef} style={{background:'#ffffff',border:'1.5px solid #e8ddd6',borderRadius:20,padding:'36px 32px 28px',display:'inline-flex',flexDirection:'column',alignItems:'center',gap:0,boxShadow:'0 2px 20px rgba(107,29,29,.07)'}}>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:600,color:'#1C1208',marginBottom:24,letterSpacing:'-.01em'}}>
                  local<em style={{fontStyle:'italic',color:'rgba(28,18,8,.4)'}}>ly</em>
                </div>
                <div style={{padding:10,background:'#fff',border:'1.5px solid #e8ddd6',borderRadius:12}}>
                  <QRCodeSVG value={`${window.location.origin}/partner/${slug}`} size={170} fgColor="#1C1208" bgColor="#ffffff" level="M"/>
                </div>
                <div style={{marginTop:20,fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:300,color:'#7A6555',textAlign:'center',lineHeight:1.65,maxWidth:220}}>
                  Scannez pour accéder à votre espace partenaire
                </div>
                <div style={{marginTop:14,fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:600,color:'#1C1208',textAlign:'center'}}>
                  {partner?.nom}
                </div>
              </div>
              <div style={{marginTop:12}}>
                <button onClick={downloadPrtQrCard} style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:500,background:'#1C1208',color:'#F7F3EE',padding:'11px 22px',borderRadius:9,border:'none',cursor:'pointer',letterSpacing:'.015em'}}>
                  Télécharger en PNG
                </button>
              </div>
            </div>
          </>
        )}

        {tab==='menu'&&(
          <>
            {menuForm!==null&&(
              <div className="prt-menu-form">
                <div className="prt-section-label fb">{getMetierLabels(partner?.categorie).formTitle(!!menuForm.id)}</div>
                <div className="prt-field">
                  <div className="prt-label fb">Nom *</div>
                  <input className="prt-input fb" value={menuForm.nom||''} onChange={e=>setMenuForm(f=>({...f,nom:e.target.value}))} placeholder={getMetierLabels(partner?.categorie).nomPlaceholder}/>
                </div>
                <div className="prt-field">
                  <div className="prt-label fb">Description</div>
                  <textarea className="prt-textarea fb" value={menuForm.description||''} onChange={e=>setMenuForm(f=>({...f,description:e.target.value}))} placeholder={getMetierLabels(partner?.categorie).descPlaceholder}/>
                </div>
                <div className="prt-field">
                  <div className="prt-label fb">Prix (€) *</div>
                  <input className="prt-input fb" type="number" step="0.01" min="0" value={menuForm.prix||''} onChange={e=>setMenuForm(f=>({...f,prix:e.target.value}))} placeholder="0.00" style={{maxWidth:160}}/>
                </div>
                {['Sport','Bien-être','Activité'].includes(partner?.categorie)&&(
                  <div className="prt-field">
                    <div className="prt-label fb">Durée <span style={{fontWeight:300,color:'#9B8B7A',fontSize:11}}>(optionnel)</span></div>
                    <input className="prt-input fb" type="text" value={menuForm.duree||''} onChange={e=>setMenuForm(f=>({...f,duree:e.target.value}))} placeholder="ex : 1h, 45min, 2h30" style={{maxWidth:180}}/>
                  </div>
                )}
                <div className="prt-field">
                  <div className="prt-label fb">Photo (optionnel)</div>
                  <label className="prt-photo-btn fb" style={{display:'inline-block'}}>
                    {menuForm.photo_url?'Changer la photo':'Ajouter une photo'}
                    <input type="file" accept="image/*" onChange={handleMenuPhoto} style={{display:'none'}}/>
                  </label>
                  {menuForm.photo_url&&<img src={menuForm.photo_url} style={{width:72,height:72,objectFit:'cover',borderRadius:8,display:'block',marginTop:10}} alt=""/>}
                </div>
                {menuErr&&<div className="prt-err fb">{menuErr}</div>}
                <div style={{display:'flex',gap:10}}>
                  <button className="prt-btn-secondary fb" onClick={()=>setMenuForm(null)}>Annuler</button>
                  <button className="prt-btn-primary fb" onClick={saveMenuItem} disabled={savingMenu||!menuForm.nom||!menuForm.prix}>
                    {savingMenu?'Sauvegarde…':menuForm.id?'Modifier':'Ajouter'}
                  </button>
                </div>
              </div>
            )}
            {menuForm===null&&(
              <button className="prt-add-btn fb" onClick={()=>setMenuForm({nom:'',description:'',prix:'',photo_url:'',duree:''})}>
                {getMetierLabels(partner?.categorie).ajouterLabel}
              </button>
            )}
            {loadingMenu?<div className="prt-loading fb">Chargement…</div>:(
              <div className="prt-menu-list">
                {menuItems.length===0&&<div className="prt-empty fb">{getMetierLabels(partner?.categorie).emptyLabel}</div>}
                {menuItems.map(item=>(
                  <div key={item.id} className="prt-menu-item">
                    {item.photo_url&&<img src={item.photo_url} className="prt-menu-item-img" alt=""/>}
                    <div className="prt-menu-item-body">
                      <div className="prt-menu-item-name">{item.nom}</div>
                      {item.description&&<div className="prt-menu-item-desc fb">{item.description}</div>}
                      <div className="prt-menu-item-price">{Number(item.prix).toFixed(2)} €</div>
                    </div>
                    <div className="prt-menu-item-actions">
                      {deletingId===item.id?(
                        <div className="prt-delete-confirm">
                          <span className="fb" style={{fontSize:11,color:'#9B2335',whiteSpace:'nowrap'}}>Confirmer ?</span>
                          <button className="prt-btn-danger-sm fb" onClick={()=>deleteMenuItem(item.id)}>Oui</button>
                          <button className="prt-btn-ghost-sm fb" onClick={()=>setDeletingId(null)}>Non</button>
                        </div>
                      ):(
                        <>
                          <button className="prt-btn-ghost-sm fb" onClick={()=>{setMenuForm({...item});window.scrollTo(0,0);}}>Modifier</button>
                          <button className="prt-btn-danger-sm fb" onClick={()=>setDeletingId(item.id)}>Suppr.</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab==='messages'&&(
          <div style={{maxWidth:560,display:'flex',flexDirection:'column',gap:16}}>
            <div className="prt-section-label fb">Envoyer un message à Locally</div>
            <textarea
              className="prt-textarea fb"
              value={msgText}
              onChange={e=>setMsgText(e.target.value)}
              placeholder="Votre message…"
              rows={5}
              style={{resize:'vertical'}}
            />
            {msgSent&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:'#10B981'}}>✓ Message envoyé à l'équipe Locally.</div>}
            {msgErr&&<div className="prt-err fb">{msgErr}</div>}
            <div>
              <button className="prt-btn-primary fb" onClick={sendMessage} disabled={sendingMsg||!msgText.trim()}>
                {sendingMsg?'Envoi…':'Envoyer à Locally'}
              </button>
            </div>
          </div>
        )}

        {tab==='stats'&&(
          <>
            <div className="prt-tabs-bar" style={{marginBottom:20}}>
              {[['today','Aujourd\'hui'],['week','Cette semaine'],['month','Ce mois'],['year','Cette année']].map(([v,l])=>(
                <button key={v} className={'prt-tab fb'+(statPeriod===v?' act':'')} onClick={()=>setStatPeriod(v)}>{l}</button>
              ))}
            </div>
            {loadingStats?<div className="prt-loading fb">Chargement…</div>:totalV===0&&pageViews===0&&statCA===0?(
              <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:300,color:'#9B8B7A',padding:'16px 0'}}>Pas encore de données pour cette période.</div>
            ):(
              <div className="prt-stats-grid">
                {[
                  {cur:pageViews,prev:statPrev.pageViews,label:'Vues de la page',fmt:v=>String(v)},
                  {cur:totalV,prev:statPrev.visits,label:'QR générés',fmt:v=>String(v)},
                  {cur:scannedV,prev:statPrev.scanned,label:'QR scannés',fmt:v=>String(v)},
                  {cur:statCA,prev:statPrev.ca,label:'CA généré par Locally',fmt:v=>v>0?v.toFixed(2)+' €':'—',small:statCA>0},
                ].map(({cur,prev,label,fmt,small},i)=>(
                  <div key={i} className="prt-stat-card">
                    <div className="prt-stat-num fd" style={{fontSize:small?22:34}}>{fmt(cur)}</div>
                    <div className="prt-stat-label fb">{label}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{marginTop:32}}>
              <div className="prt-section-label fb">Chiffre d'affaires — 30 derniers jours</div>
              <div style={{background:'white',border:'1px solid rgba(107,29,29,.09)',borderRadius:14,padding:'20px 16px 12px'}}>
                <BarChart data={chartData}/>
              </div>
            </div>

            <div style={{marginTop:28}}>
              <div className="prt-section-label fb">Dernières transactions</div>
              {recentTxns.length===0?(
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:300,color:'#9B8B7A',padding:'16px 0'}}>Aucune transaction pour le moment</div>
              ):(
                <div style={{background:'white',border:'1px solid rgba(107,29,29,.09)',borderRadius:14,overflow:'hidden'}}>
                  {recentTxns.map((t,i)=>{
                    const d=new Date(t.created_at);
                    const dateStr=d.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
                    return(
                      <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 20px',borderBottom:i<recentTxns.length-1?'1px solid rgba(107,29,29,.07)':'none'}}>
                        <div>
                          <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:400,color:'#1C1208'}}>{Number(t.montant_client).toFixed(2)} €</div>
                          <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:300,color:'#9B8B7A',marginTop:2}}>{dateStr}</div>
                        </div>
                        <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:500,color:'#6B1D1D',background:'rgba(107,29,29,.07)',borderRadius:20,padding:'4px 10px'}}>
                          -{t.taux_reduction_applique}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {reviewClicks>0&&(
              <div style={{marginTop:8,fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:300,color:'#7A6555',display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:16}}>⭐</span>
                <span><strong style={{fontWeight:500,color:'#1C1208'}}>{reviewClicks}</strong> client{reviewClicks>1?'s':''} {reviewClicks>1?'ont':'a'} cliqué pour laisser un avis Google</span>
              </div>
            )}
          </>
        )}

        {tab==='valider'&&(
          <div style={{maxWidth:520,display:'flex',flexDirection:'column',gap:20}}>

            {txnStep==='scan'&&(
              <>
                <div className="prt-section-label fb">Identifier le client</div>
                <div className="txn-mode-bar">
                  <button className={'txn-mode-btn fb'+(txnScanMode==='camera'?' on':'')} onClick={()=>{setTxnScanMode('camera');setTxnScanErr('');}}>📷 Scanner</button>
                  <button className={'txn-mode-btn fb'+(txnScanMode==='manual'?' on':'')} onClick={()=>{setTxnScanMode('manual');setTxnScanErr('');}}>✏ Saisir manuellement</button>
                </div>

                {txnScanMode==='camera'&&(
                  <div className="txn-card">
                    <div className="prt-label fb">Pointez la caméra vers le QR code du client</div>
                    <div className="txn-qr-wrap"><div id="txn-qr-reader"/></div>
                  </div>
                )}

                {txnScanMode==='manual'&&(
                  <div className="txn-card">
                    <div className="prt-label fb">URL ou identifiant du QR code client</div>
                    <div style={{display:'flex',gap:8}}>
                      <input className="prt-input fb" value={txnManualId} onChange={e=>setTxnManualId(e.target.value)} placeholder="Collez l'URL ou l'identifiant UUID" style={{flex:1}} onKeyDown={e=>e.key==='Enter'&&txnManualId.trim()&&txnVerifyQR(txnManualId)}/>
                      <button className="prt-btn-primary fb" style={{whiteSpace:'nowrap',paddingLeft:16,paddingRight:16}} onClick={()=>txnVerifyQR(txnManualId)} disabled={!txnManualId.trim()}>Vérifier</button>
                    </div>
                  </div>
                )}

                {txnScanErr&&<div className="prt-err fb" style={{textAlign:'center',marginTop:4}}>{txnScanErr}</div>}
              </>
            )}

            {txnStep==='amount'&&txnVisit&&(()=>{
              const m=parseFloat(txnMontant)||0;
              const t=parseFloat(txnTaux)||0;
              const valid=m>0&&t>0;
              const commActive=partner.commission_active===true;
              const clientPays=valid
                ? commActive ? +(m-m*(t-5)/100).toFixed(2) : +(m-m*t/100).toFixed(2)
                : null;
              const comm=valid&&commActive ? +(m*0.05).toFixed(2) : null;
              return(
                <>
                  <div className="txn-client-chip">
                    <div className="txn-client-check">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(45,106,79,.85)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div>
                      <div className="txn-client-name">{txnVisit.client_name}</div>
                      <div className="txn-client-sub fb">QR validé · généré le {new Date(txnVisit.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'})}</div>
                    </div>
                  </div>

                  <div className="txn-card">
                    <div className="prt-field">
                      <div className="prt-label fb">Montant total de la transaction (€)</div>
                      <input className="prt-input fb" type="number" min="0.01" step="0.01" value={txnMontant} onChange={e=>setTxnMontant(e.target.value)} placeholder="Ex : 47.50" style={{maxWidth:200}} autoFocus/>
                    </div>
                    <div className="prt-field">
                      <div className="prt-label fb">Taux de réduction (%)</div>
                      <input className="prt-input fb" type="number" min="1" max="100" step="0.5" value={txnTaux} onChange={e=>setTxnTaux(e.target.value)} placeholder="Ex : 15" style={{maxWidth:140}}/>
                    </div>

                    {valid&&(
                      <div className="txn-calc-box">
                        <div className="txn-calc-row">
                          <span className="txn-calc-label fb">Montant initial</span>
                          <span className="txn-calc-val fd">{m.toFixed(2)} €</span>
                        </div>
                        <div className="txn-calc-divider"/>
                        <div className="txn-calc-row hilite">
                          <span className="txn-calc-label fb">Le client paie</span>
                          <span className="txn-calc-val fd">{clientPays.toFixed(2)} €</span>
                        </div>
                        {commActive&&(
                          <div className="txn-calc-row due">
                            <span className="txn-calc-label fb">Vous devez à Locally</span>
                            <span className="txn-calc-val fd">{comm.toFixed(2)} €</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {txnErr&&<div className="prt-err fb">{txnErr}</div>}
                  <div style={{display:'flex',gap:10}}>
                    <button className="prt-btn-secondary fb" onClick={txnReset}>Annuler</button>
                    <button className="prt-btn-primary fb" onClick={txnConfirm} disabled={txnSaving||!valid}>
                      {txnSaving?'Enregistrement…':'Confirmer la transaction'}
                    </button>
                  </div>
                </>
              );
            })()}

            {txnStep==='done'&&txnVisit&&(()=>{
              const m=parseFloat(txnMontant),t=parseFloat(txnTaux);
              return(
                <div className="txn-card" style={{alignItems:'center',textAlign:'center',paddingTop:32,paddingBottom:32}}>
                  <div className="txn-success-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(45,106,79,.85)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div className="prt-section-label fb" style={{justifyContent:'center',marginBottom:6}}>Transaction enregistrée</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:30,fontWeight:600,color:'#1C1208',marginBottom:6}}>{txnVisit.client_name}</div>
                  <div className="prt-empty fb" style={{padding:0,marginBottom:6}}>Montant initial : {m.toFixed(2)} €</div>
                  <div className="prt-empty fb" style={{padding:0,marginBottom:6}}>
                    Le client a payé : {partner.commission_active===true?(m-m*(t-5)/100).toFixed(2):(m-m*t/100).toFixed(2)} €
                  </div>
                  {partner.commission_active===true&&(
                    <div className="prt-empty fb" style={{padding:0,marginBottom:24}}>Dû à Locally : {(m*0.05).toFixed(2)} €</div>
                  )}
                  <button className="prt-btn-primary fb" onClick={txnReset}>Valider une autre transaction</button>
                </div>
              );
            })()}

          </div>
        )}

        {tab==='parametres'&&(
          <div style={{maxWidth:520,display:'flex',flexDirection:'column',gap:32}}>

            <div>
              <div className="prt-section-label fb">Changer mon code d'accès</div>
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                {settingsCodeErr&&<div className="auth-err fb">{settingsCodeErr}</div>}
                <div>
                  <label className="prt-label fb">Nouveau code d'accès</label>
                  <input className="prt-input" type="password" value={settingsCodeForm.code1} onChange={e=>setSettingsCodeForm(f=>({...f,code1:e.target.value}))} placeholder="6 caractères minimum"/>
                </div>
                <div>
                  <label className="prt-label fb">Confirmer le code</label>
                  <input className="prt-input" type="password" value={settingsCodeForm.code2} onChange={e=>setSettingsCodeForm(f=>({...f,code2:e.target.value}))} placeholder="••••••"/>
                </div>
                <button className="prt-btn-primary fb" onClick={saveSettingsCode} disabled={savingSettingsCode||!settingsCodeForm.code1||!settingsCodeForm.code2}>
                  {settingsCodeSaved?'✓ Code d\'accès mis à jour':savingSettingsCode?'Enregistrement…':'Changer le code'}
                </button>
              </div>
            </div>

            <div style={{borderTop:'1px solid rgba(107,29,29,.1)',paddingTop:28}}>
              <div className="prt-section-label fb">Publier mon profil</div>
              {partner.visible!==false?(
                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:500,color:'#2D6A4F',background:'rgba(45,106,79,.07)',border:'1px solid rgba(45,106,79,.2)',borderRadius:10,padding:'12px 16px'}}>
                    <span style={{fontSize:16}}>✓</span> Votre profil est en ligne sur Locally
                  </div>
                  <button className="prt-btn-danger fb" onClick={toggleVisible} disabled={savingVisible}>
                    {savingVisible?'Mise à jour…':'Mettre en pause'}
                  </button>
                </div>
              ):canPublish?(
                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:400,color:'#7A6555',lineHeight:1.6}}>
                    Votre profil est prêt. Publiez-le pour apparaître sur Locally et attirer vos premiers clients.
                  </div>
                  <button className="prt-btn-primary fb" onClick={toggleVisible} disabled={savingVisible}>
                    {savingVisible?'Publication…':'Publier mon profil sur Locally'}
                  </button>
                </div>
              ):(
                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:400,color:'#9B8B7A',background:'#F5F0EA',border:'1px solid #E8DDD0',borderRadius:10,padding:'12px 16px',lineHeight:1.6}}>
                    Ajoutez une <strong style={{color:'#1C1208'}}>photo</strong> et une <strong style={{color:'#1C1208'}}>description</strong> (min. 20 caractères) pour pouvoir publier votre profil.
                  </div>
                  <button className="prt-btn-primary fb" disabled style={{opacity:.45,cursor:'not-allowed'}}>
                    Publier mon profil sur Locally
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

// TODO: Réactiver pour les commandes téléphoniques automatiques
// await fetch("https://api.elevenlabs.io/v1/convai/twilio/outbound-call", {
//   method: "POST",
//   headers: { "xi-api-key": import.meta.env.VITE_ELEVENLABS_API_KEY, "Content-Type": "application/json" },
//   body: JSON.stringify({
//     agent_id: "agent_3801kpzkh35qfsaad81savww2sh0",
//     agent_phone_number_id: "phnum_0601kq5q01tves1syvmw2kzk5jnd",
//     to_number: "+33778780353",
//     conversation_initiation_client_data: { dynamic_variables: { script } },
//   }),
// });
function GenericPartnerPage({partner,onBack,user,profile,onAuthRequired}){
  const [menuItems,setMenuItems]=useState([]);
  const [loadingMenu,setLoadingMenu]=useState(true);
  const [visitMode,setVisitMode]=useState(null);
  const [visitData,setVisitData]=useState(null);
  const [visitLoading,setVisitLoading]=useState(false);
  const [countdown,setCountdown]=useState('01:00:00');
  const [countdownPct,setCountdownPct]=useState(100);
  const [scannedConfirm,setScannedConfirm]=useState(null);
  const sessionExpired=!!(profile?.session_expires_at&&new Date()>new Date(profile.session_expires_at));

  useEffect(()=>{
    const today=new Date().toISOString().slice(0,10);
    const vk=`view_${partner.id}_${today}`;
    if(!localStorage.getItem(vk)){supabase.from('page_views').insert({partner_id:partner.id});localStorage.setItem(vk,'1');}
    supabase.from('menu_items').select('*').eq('partner_id',partner.id).order('created_at',{ascending:false}).then(({data})=>{
      setMenuItems(data||[]);setLoadingMenu(false);
    });
  },[partner.id]);

  useEffect(()=>{
    if(!visitData)return;
    const DURATION=1*60*60*1000;
    const tick=()=>{
      const rem=new Date(visitData.expires_at)-Date.now();
      if(rem<=0){setCountdown('Expiré');setCountdownPct(0);return;}
      const h=Math.floor(rem/3600000),m=Math.floor((rem%3600000)/60000),s=Math.floor((rem%60000)/1000);
      setCountdown(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
      setCountdownPct(Math.round(rem/DURATION*100));
    };
    tick();const id=setInterval(tick,1000);return()=>clearInterval(id);
  },[visitData]);

  useEffect(()=>{
    if(!visitData?.qr_code_id)return;
    const iv=setInterval(async()=>{
      const{data:v}=await supabase.from('visits').select('id,scanned').eq('qr_code_id',visitData.qr_code_id).maybeSingle();
      if(v?.scanned){
        clearInterval(iv);
        const{data:txn}=await supabase.from('transactions').select('montant_reduction').eq('visit_id',v.id).maybeSingle();
        setScannedConfirm({montantEconomise:txn?.montant_reduction||null});
      }
    },5000);
    return()=>clearInterval(iv);
  },[visitData?.qr_code_id]);

  async function generateVisit(u=user,prof=profile){
    if(!u||!prof)return;
    setVisitLoading(true);
    const qr_code_id=crypto.randomUUID();
    const expires_at=new Date(Date.now()+1*60*60*1000).toISOString();
    const hotel_slug=localStorage.getItem('source_hotel')||null;
    await supabase.from('visits').insert({qr_code_id,partner_id:partner.id,client_name:prof.prenom,user_id:u.id,expires_at,...(hotel_slug?{hotel_slug}:{})});
    setVisitData({qr_code_id,expires_at,clientName:prof.prenom});setVisitLoading(false);
  }

  function handleGenerateClick(){
    if(user&&profile)generateVisit();
    else onAuthRequired((u,prof)=>generateVisit(u,prof));
  }

  const fmtR=r=>r&&/^[\d.]+$/.test(r.trim())?r.trim()+'%':r;
  const horaires=partner.horaires||{};
  const hasHoraires=Object.keys(horaires).some(k=>horaires[k]);

  const openStatus=getOpenStatus(horaires);

  return(
    <>
      <div className="gpp-hero">
        {partner.photo_url&&<img src={partner.photo_url} className="gpp-hero-img" alt=""/>}
        <div className="gpp-hero-overlay"/>
        <div className="gpp-hero-content">
          <div className="gpp-hero-cat fb">{partner.categorie}</div>
          <div className="gpp-hero-name fd">{partner.nom}</div>
          {openStatus&&(
            <div className={'gpp-status-badge '+openStatus}>
              <div className={'gpp-sdot '+openStatus}/>
              <span>{openStatus==='open'?'Ouvert':openStatus==='soon'?'Ferme bientôt':'Fermé'}</span>
            </div>
          )}
          {partner.description&&<div className="gpp-hero-desc fb" style={{marginTop:14}}>{partner.description}</div>}
        </div>
      </div>
      <div className="gpp-body">

        {/* Infos */}
        <div className="gpp-info-grid">
          {partner.google_maps&&(
            <div className="gpp-info-card" style={{cursor:'pointer'}}
              onClick={()=>window.open("https://maps.google.com/?q="+encodeURIComponent(partner.google_maps),"_blank")}>
              <div className="gpp-info-label fb">Adresse</div>
              <div className="gpp-info-val fb" style={{color:'#6B1D1D',textDecoration:'underline',textDecorationColor:'rgba(107,29,29,.28)'}}>
                {partner.google_maps} <span style={{fontSize:11}}>↗</span>
              </div>
            </div>
          )}
          {partner.telephone&&(
            <div className="gpp-info-card">
              <div className="gpp-info-label fb">Téléphone</div>
              <div className="gpp-info-val fb">{partner.telephone}</div>
            </div>
          )}
          {partner.reduction&&(
            <div className="gpp-info-card" style={{gridColumn:'1/-1'}}>
              <div className="gpp-info-label fb">Votre réduction</div>
              <div className="fb" style={{marginTop:6,fontSize:13,fontWeight:300,color:'#6B1D1D',display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:16,height:1,background:'#6B1D1D',display:'inline-block',flexShrink:0}}/>
                Votre réduction : {fmtR(partner.reduction)}
              </div>
            </div>
          )}
        </div>

        {(partner.google_review_url||partner.site_web)&&(
          <div style={{marginBottom:32,display:'flex',gap:10,flexWrap:'wrap'}}>
            {partner.google_review_url&&(
              <button
                className="btn-call fb"
                style={{display:'inline-flex',alignItems:'center',gap:8}}
                onClick={()=>{
                  supabase.from('review_clicks').insert({partner_id:partner.id});
                  window.open(partner.google_review_url,'_blank','noopener');
                }}
              >
                ⭐ Laisser un avis Google
              </button>
            )}
            {partner.site_web&&(
              <button
                className="btn-call fb"
                style={{display:'inline-flex',alignItems:'center',gap:8,background:'transparent',border:'1px solid rgba(107,29,29,.25)',color:'#6B1D1D'}}
                onClick={()=>window.open(partner.site_web,'_blank','noopener')}
              >
                Visiter le site →
              </button>
            )}
          </div>
        )}

        {/* Horaires */}
        <div className="gpp-section">
          <div className="gpp-section-title fd">Horaires <em>d'ouverture</em></div>
          {hasHoraires?(()=>{
            const todayFr=['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][new Date().getDay()];
            const fmtSlots=cr=>Array.isArray(cr)?cr.filter(s=>s[0]&&s[1]).map(s=>s[0]+' – '+s[1]).join('  ·  '):(cr||'');
            return(
              <div className="gpp-hours-list">
                {DAYS.map(day=>{
                  const h=horaires[day];
                  const isToday=day===todayFr;
                  const badge=isToday&&openStatus;
                  const badgeLbl=openStatus==='open'?'Ouvert':openStatus==='soon'?'Bientôt':'Fermé';
                  return(
                    <div key={day} className={'gpp-hours-line'+(isToday?' today':'')}>
                      <span className="gpp-hl-day fb">{day}</span>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        {h?.ouvert
                          ?<span className="gpp-hl-slots fb">{fmtSlots(h.creneaux)}</span>
                          :<span className="gpp-hl-closed fb">Fermé</span>
                        }
                        {badge&&(
                          <div className={'gpp-status-badge-sm '+openStatus}>
                            <div className={'gpp-sdot '+openStatus}/>
                            {badgeLbl}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })():(
            <div className="gpp-no-hours fb">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,opacity:.45}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Horaires non renseignés — contactez le commerce
            </div>
          )}
        </div>

        {/* Flow Je me déplace */}
        <div className="gpp-section">
          {visitMode===null&&(
            <>
              <div className="gpp-section-title fd">Préparer <em>ma visite</em></div>
              <div className="visit-mode-card" style={{maxWidth:420}} onClick={()=>setVisitMode('visit')}>
                <div className="visit-mode-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div className="visit-mode-title fd">Je me déplace</div>
                <div className="visit-mode-desc fb">Obtenez un QR code et profitez de votre réduction sur place.</div>
                <div className="visit-mode-foot"><span className="visit-mode-cta fb">Générer mon QR code</span><div className="visit-mode-arrow">→</div></div>
              </div>
            </>
          )}
          {visitMode==='visit'&&(
            <>
              <button className="visit-back fb" onClick={()=>{setVisitMode(null);setVisitData(null);setScannedConfirm(null);setCountdown('01:00:00');setCountdownPct(100);}}>← Retour</button>
              {!visitData?(
                <>
                  <div className="gpp-section-title fd">Votre <em>QR code</em></div>
                  <div style={{maxWidth:400}}>
                    {user&&profile?(
                      <div className="op-label fb" style={{marginBottom:16}}>Bonjour <strong>{profile.prenom}</strong></div>
                    ):(
                      <div className="op-label fb" style={{marginBottom:16,color:'#7A6555'}}>Connectez-vous pour générer votre QR code et profiter de votre réduction.</div>
                    )}
                    {sessionExpired?(
                      <div className="op-label fb" style={{color:'#B91C1C',lineHeight:1.5}}>Votre session a expiré. Scannez le QR code de votre chambre pour renouveler vos 24h.</div>
                    ):(
                      <button className="btn-call fb" onClick={handleGenerateClick} disabled={visitLoading}>
                        {visitLoading?'Génération…':'Générer mon QR code'}
                      </button>
                    )}
                  </div>
                </>
              ):(
                scannedConfirm?(
                  <div className="visit-qr-wrap">
                    <div className="visit-qr-card" style={{textAlign:'center',padding:'40px 24px',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
                      <div style={{width:56,height:56,borderRadius:'50%',background:'rgba(21,128,61,.1)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:4}}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <div className="visit-qr-partner fd" style={{color:'#15803D',fontSize:20}}>Réduction appliquée !</div>
                      {scannedConfirm.montantEconomise!=null&&(
                        <div className="visit-qr-sub fb" style={{fontSize:14,lineHeight:1.6}}>
                          Vous avez économisé <strong>{Number(scannedConfirm.montantEconomise).toFixed(2)} €</strong> chez {partner.nom}
                        </div>
                      )}
                    </div>
                    <button className="btn-primary fb" onClick={()=>{setVisitData(null);setScannedConfirm(null);setCountdown('01:00:00');setCountdownPct(100);}}>
                      Générer un nouveau QR code
                    </button>
                  </div>
                ):(
                  <div className="visit-qr-wrap">
                    <div className="visit-qr-card">
                      <div className="visit-qr-card-header">
                        <div className="visit-qr-partner fd">{partner.nom}</div>
                        <div className="visit-qr-partner-tag fb">Partenaire Locally</div>
                      </div>
                      <div className="visit-qr-box">
                        <QRCodeSVG value={`https://locally-gules.vercel.app/scan?id=${visitData.qr_code_id}`} size={220} fgColor="#1C1208" bgColor="#FFFFFF" level="M"/>
                      </div>
                      <div className="visit-qr-client">
                        <div className="visit-qr-name fd">{visitData.clientName}</div>
                        <div className="visit-qr-sub fb">Présentez ce QR code à l'accueil</div>
                      </div>
                      <div className="visit-qr-countdown-wrap">
                        <div className="visit-qr-countdown-label fb">Expire dans</div>
                        <div className={"visit-qr-countdown fd"+(countdown==='Expiré'?' expired':'')}>{countdown}</div>
                        <div className="visit-qr-progress"><div className="visit-qr-progress-bar" style={{width:countdownPct+'%'}}/></div>
                      </div>
                    </div>
                    <button className="btn-primary fb" onClick={()=>{setVisitData(null);setCountdown('01:00:00');setCountdownPct(100);}}>
                      Régénérer mon code
                    </button>
                  </div>
                )
              )}
            </>
          )}
        </div>

        {/* Menu / Prestations / Services / Offres */}
        {(loadingMenu||menuItems.length>0)&&(
          <div className="gpp-section">
            <div className="gpp-section-title fd">{(()=>{const[first,...rest]=getMetierLabels(partner.categorie).sectionLabel.split(' ');return<>{first} <em>{rest.join(' ')}</em></>;})()}</div>
            {loadingMenu?(
              <div className="fb" style={{fontSize:13,color:'#7A6555',padding:'16px 0'}}>Chargement…</div>
            ):(
              <div className="gpp-menu-grid">
                {menuItems.map(item=>(
                  <div key={item.id} className="gpp-item">
                    {item.photo_url?<div className="gpp-item-img"><img src={item.photo_url} alt={item.nom}/></div>:<div className="gpp-no-photo fb">Pas de photo</div>}
                    <div className="gpp-item-body">
                      <div className="gpp-item-name">{item.nom}</div>
                      {item.description&&<div className="gpp-item-desc fb">{item.description}</div>}
                      <div className="gpp-item-foot">
                        <div className="gpp-item-price">{Number(item.prix).toFixed(2)} €{item.duree&&<span style={{color:'#9B8B7A',fontWeight:300,marginLeft:6}}>· {item.duree}</span>}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <SiteFooter/>
      </div>

    </>
  );
}

function HotelView({onLogout}){
  const slug=window.location.pathname.replace(/^\/hotel\//,'').split('/')[0];
  const [authed,setAuthed]=useState(()=>localStorage.getItem('hotel_slug')===slug);
  const [loginCode,setLoginCode]=useState('');
  const [loginErr,setLoginErr]=useState('');
  const [loginLoading,setLoginLoading]=useState(false);
  const [hotel,setHotel]=useState(null);
  const [loading,setLoading]=useState(true);
  const [htlLoadErr,setHtlLoadErr]=useState('');
  const [stats,setStats]=useState(null);
  const [loadingStats,setLoadingStats]=useState(true);
  const [htlStatPeriod,setHtlStatPeriod]=useState('month');
  const [htlChartData,setHtlChartData]=useState([]);
  const [htlCodeForm,setHtlCodeForm]=useState({code1:'',code2:''});
  const [savingHtlCode,setSavingHtlCode]=useState(false);
  const [htlCodeErr,setHtlCodeErr]=useState('');
  const [htlCodeSaved,setHtlCodeSaved]=useState(false);
  const [htlProfileForm,setHtlProfileForm]=useState({nom:'',type:'',email:'',telephone:''});
  const [savingHtlProfile,setSavingHtlProfile]=useState(false);
  const [htlProfileSaved,setHtlProfileSaved]=useState(false);
  const [htlProfileErr,setHtlProfileErr]=useState('');
  const [tab,setTab]=useState('stats');
  const [htlMsgText,setHtlMsgText]=useState('');
  const [sendingHtlMsg,setSendingHtlMsg]=useState(false);
  const [htlMsgSent,setHtlMsgSent]=useState(false);
  const [htlMsgErr,setHtlMsgErr]=useState('');
  const qrCardRef=useRef(null);

  async function loadHotel(){
    try{
      const{data,error}=await supabase.from('hotels').select('*').eq('slug',slug).eq('status','approuve').maybeSingle();
      if(error)throw error;
      setHotel(data);
      if(data)setHtlProfileForm({nom:data.nom||'',type:data.type||'',email:data.email||'',telephone:data.telephone||''});
    }catch(e){setHtlLoadErr('Impossible de charger vos données. Vérifiez votre connexion.');}
    setLoading(false);
  }

  function htlGetPeriodFrom(period){
    const n=new Date();
    if(period==='today')return new Date(n.getFullYear(),n.getMonth(),n.getDate()).toISOString();
    if(period==='week'){const d=n.getDay()||7;return new Date(n.getFullYear(),n.getMonth(),n.getDate()-d+1).toISOString();}
    if(period==='month')return new Date(n.getFullYear(),n.getMonth(),1).toISOString();
    return new Date(n.getFullYear(),0,1).toISOString();
  }

  async function loadStats(period='month'){
    setLoadingStats(true);
    try{
      const from=htlGetPeriodFrom(period);
      const from30=new Date(Date.now()-30*24*60*60*1000).toISOString();
      const[{data:visits,error:e1},{data:txns},{data:txns30}]=await Promise.all([
        supabase.from('visits').select('*,candidates(nom)').eq('hotel_slug',slug).gte('created_at',from).order('created_at',{ascending:false}),
        supabase.from('transactions').select('commission_hotel,created_at').eq('hotel_slug',slug).gte('created_at',from),
        supabase.from('transactions').select('commission_hotel,created_at').eq('hotel_slug',slug).gte('created_at',from30),
      ]);
      if(e1)throw e1;
      const countByPartner={};
      (visits||[]).forEach(v=>{
        if(!v.partner_id)return;
        if(!countByPartner[v.partner_id])countByPartner[v.partner_id]={count:0,nom:v.candidates?.nom||v.partner_id};
        countByPartner[v.partner_id].count++;
      });
      let topPartner=null;let topCount=0;
      Object.values(countByPartner).forEach(p=>{if(p.count>topCount){topCount=p.count;topPartner=p.nom;}});
      const commissionPeriod=(txns||[]).reduce((s,t)=>s+Number(t.commission_hotel||0),0);
      setStats({periodCount:(visits||[]).length,topPartner,commissionPeriod});
      const byDay={};
      for(let i=29;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);byDay[d.toISOString().slice(0,10)]=0;}
      (txns30||[]).forEach(t=>{const k=t.created_at.slice(0,10);if(byDay[k]!==undefined)byDay[k]+=Number(t.commission_hotel||0);});
      setHtlChartData(Object.entries(byDay).map(([date,ca])=>({date,ca})));
    }catch(e){console.error('loadStats hotel:',e);}
    setLoadingStats(false);
  }

  useEffect(()=>{if(authed){loadHotel();loadStats(htlStatPeriod);}},[authed]);
  useEffect(()=>{if(authed)loadStats(htlStatPeriod);},[htlStatPeriod]);

  async function downloadQrCard(){
    if(!qrCardRef.current)return;
    try{
      const canvas=await html2canvas(qrCardRef.current,{scale:3,useCORS:true,backgroundColor:'#ffffff'});
      const link=document.createElement('a');
      link.download=`locally-qr-${slug}.png`;
      link.href=canvas.toDataURL('image/png');
      link.click();
    }catch(e){console.error('downloadQrCard:',e);}
  }

  async function saveHtlAccessCode(){
    if(!htlCodeForm.code1.trim()){setHtlCodeErr('Le code ne peut pas être vide.');return;}
    if(htlCodeForm.code1.length<6){setHtlCodeErr('Le code doit contenir au moins 6 caractères.');return;}
    if(htlCodeForm.code1!==htlCodeForm.code2){setHtlCodeErr('Les codes ne correspondent pas.');return;}
    setHtlCodeErr('');setSavingHtlCode(true);
    try{
      const{error}=await supabase.from('hotels').update({access_code:htlCodeForm.code1.trim()}).eq('slug',slug);
      if(error)throw error;
      setHtlCodeSaved(true);setHtlCodeForm({code1:'',code2:''});
      setTimeout(()=>setHtlCodeSaved(false),2500);
    }catch(e){setHtlCodeErr('Erreur lors de la sauvegarde. Réessayez.');}
    setSavingHtlCode(false);
  }

  async function saveHtlProfile(){
    setSavingHtlProfile(true);setHtlProfileErr('');
    try{
      const{error}=await supabase.from('hotels').update({nom:htlProfileForm.nom.trim(),type:htlProfileForm.type.trim(),email:htlProfileForm.email.trim(),telephone:htlProfileForm.telephone.trim()}).eq('slug',slug);
      if(error)throw error;
      setHotel(h=>({...h,...htlProfileForm}));
      setHtlProfileSaved(true);setTimeout(()=>setHtlProfileSaved(false),3000);
    }catch(e){setHtlProfileErr('Erreur lors de la sauvegarde. Réessayez.');}
    setSavingHtlProfile(false);
  }

  async function sendHtlMessage(){
    if(!htlMsgText.trim()||!hotel)return;
    setSendingHtlMsg(true);setHtlMsgErr('');
    try{
      const{error}=await supabase.from('messages').insert({hotel_slug:slug,hotel_name:hotel.nom,message:htlMsgText.trim()});
      if(error)throw error;
      setHtlMsgText('');setHtlMsgSent(true);setTimeout(()=>setHtlMsgSent(false),3000);
    }catch(e){setHtlMsgErr('Erreur lors de l\'envoi. Réessayez.');}
    setSendingHtlMsg(false);
  }

  async function handleLogin(e){
    e.preventDefault();setLoginLoading(true);setLoginErr('');
    try{
      const{data,error}=await supabase.from('hotels').select('*').eq('slug',slug).eq('access_code',loginCode.trim()).eq('status','approuve').maybeSingle();
      if(error)throw error;
      if(data){
        localStorage.setItem('hotel_slug',slug);
        setHotel(data);
        setHtlProfileForm({nom:data.nom||'',type:data.type||'',email:data.email||'',telephone:data.telephone||''});
        setAuthed(true);
      }else{
        setLoginErr('Code incorrect ou accès non autorisé.');
      }
    }catch(e){setLoginErr('Erreur de connexion. Réessayez.');}
    setLoginLoading(false);
  }

  function logout(){localStorage.removeItem('hotel_slug');window.history.pushState({},'','/login');onLogout();}

  if(!authed) return(
    <div className="prt-login-wrap">
      <style>{CSS}</style>
      <div className="prt-login">
        <div className="prt-logo fd">local<em>ly</em></div>
        <div className="prt-login-title fd">Espace hôtel</div>
        <div className="prt-login-sub fb">Entrez votre code d'accès pour accéder à votre espace.</div>
        <form onSubmit={handleLogin}>
          <input className="prt-input fb" type="password" placeholder="Code d'accès" value={loginCode} onChange={e=>{setLoginCode(e.target.value);setLoginErr('');}} autoFocus style={{marginBottom:10}}/>
          {loginErr&&<div className="prt-err fb">{loginErr}</div>}
          <button type="submit" className="prt-btn-primary fb" style={{width:'100%'}} disabled={loginLoading}>
            {loginLoading?'Vérification…':'Accéder →'}
          </button>
        </form>
      </div>
    </div>
  );

  return(
    <div className="htl-wrap">
      <style>{CSS}</style>
      <div className="htl-header">
        <div className="htl-logo fd">local<em>ly</em></div>
        <button className="htl-logout fb" onClick={logout}>Déconnexion</button>
      </div>
      {loading?(
        <div className="htl-content">
          {htlLoadErr
            ?<div className="prt-err fb" style={{padding:'40px 0'}}>{htlLoadErr}</div>
            :<div className="fb" style={{color:'#7A6555',padding:'40px 0'}}>Chargement…</div>
          }
        </div>
      ):!hotel?(
        <div className="htl-content"><div className="fb" style={{color:'#7A6555',padding:'40px 0'}}>Établissement introuvable.</div></div>
      ):(
        <>
          <div style={{padding:'28px 28px 0',maxWidth:800,margin:'0 auto'}}>
            <div className="htl-name fd">{hotel.nom}</div>
            <div className="htl-type fb">{hotel.type}</div>
          </div>
          <div className="prt-tabs-bar" style={{marginTop:16}}>
            {[['stats','Mes stats'],['qrcode','QR Code'],['messages','Messages'],['parametres','Paramètres']].map(([v,l])=>(
              <button key={v} className={'prt-tab fb'+(tab===v?' act':'')} onClick={()=>setTab(v)}>{l}</button>
            ))}
          </div>
          <div className="htl-content">

            {tab==='stats'&&(
              <>
                <div className="prt-tabs-bar" style={{marginBottom:20}}>
                  {[['today','Aujourd\'hui'],['week','Cette semaine'],['month','Ce mois'],['year','Cette année']].map(([v,l])=>(
                    <button key={v} className={'prt-tab fb'+(htlStatPeriod===v?' act':'')} onClick={()=>setHtlStatPeriod(v)}>{l}</button>
                  ))}
                </div>
                {loadingStats?(
                  <div className="fb" style={{color:'#7A6555',padding:'24px 0',fontSize:13}}>Chargement des stats…</div>
                ):stats?.periodCount===0&&stats?.commissionPeriod===0?(
                  <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:300,color:'#9B8B7A',padding:'16px 0'}}>Pas encore de données pour cette période.</div>
                ):(
                  <div className="htl-stats-grid">
                    <div className="htl-stat-card">
                      <div className="htl-stat-label fb">Visites</div>
                      <div className="htl-stat-num fd">{stats?.periodCount??0}</div>
                      <div className="htl-stat-desc fb">clients depuis votre hôtel</div>
                    </div>
                    <div className="htl-stat-card">
                      <div className="htl-stat-label fb">Partenaire le + visité</div>
                      <div className="htl-stat-num fd" style={{fontSize:stats?.topPartner?20:32}}>{stats?.topPartner||'—'}</div>
                      <div className="htl-stat-desc fb">{stats?.topPartner?'via vos recommandations':'aucune visite encore'}</div>
                    </div>
                    <div className="htl-stat-card">
                      <div className="htl-stat-label fb">Revenus générés</div>
                      <div className="htl-stat-num fd">{stats?.commissionPeriod!=null?stats.commissionPeriod.toFixed(2)+' €':'—'}</div>
                      <div className="htl-stat-desc fb">commission 1% sur transactions</div>
                    </div>
                  </div>
                )}
                <div style={{marginTop:32}}>
                  <div className="prt-section-label fb">Revenus — 30 derniers jours</div>
                  <div style={{background:'white',border:'1px solid rgba(107,29,29,.09)',borderRadius:14,padding:'20px 16px 12px'}}>
                    <BarChart data={htlChartData}/>
                  </div>
                </div>
              </>
            )}

            {tab==='qrcode'&&(
              <div>
                <div ref={qrCardRef} style={{background:'#ffffff',border:'1.5px solid #e8ddd6',borderRadius:20,padding:'40px 32px 32px',display:'flex',flexDirection:'column',alignItems:'center',gap:0,maxWidth:340,boxShadow:'0 2px 24px rgba(107,29,29,.07)'}}>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:600,color:'#1C1208',marginBottom:28,letterSpacing:'-.01em'}}>
                    local<em style={{fontStyle:'italic',color:'rgba(28,18,8,.4)'}}>ly</em>
                  </div>
                  <div style={{padding:10,background:'#fff',border:'1.5px solid #e8ddd6',borderRadius:12}}>
                    <QRCodeSVG value={`${window.location.origin}/?hotel=${slug}`} size={180} fgColor="#1C1208" bgColor="#ffffff" level="M"/>
                  </div>
                  <div style={{marginTop:24,fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:600,color:'#1C1208',textAlign:'center',lineHeight:1.2}}>
                    Découvrez le meilleur<br/>de Bordeaux
                  </div>
                  <div style={{marginTop:10,fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:300,color:'#7A6555',textAlign:'center',lineHeight:1.65,maxWidth:240}}>
                    Scannez pour accéder aux adresses locales sélectionnées et profitez de réductions exclusives
                  </div>
                  <div style={{marginTop:24,paddingTop:16,borderTop:'1px solid #f0e9e3',width:'100%',textAlign:'center',fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:400,color:'rgba(107,29,29,.5)',letterSpacing:'.04em'}}>
                    Offert par votre hôtel · {window.location.host}
                  </div>
                </div>
                <button onClick={downloadQrCard} style={{marginTop:14,fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:500,background:'#1C1208',color:'#F7F3EE',padding:'11px 22px',borderRadius:9,border:'none',cursor:'pointer',letterSpacing:'.015em'}}>
                  Télécharger en PNG
                </button>
              </div>
            )}

            {tab==='messages'&&(
              <div style={{maxWidth:560,display:'flex',flexDirection:'column',gap:16}}>
                <div className="prt-section-label fb">Envoyer un message à Locally</div>
                <textarea
                  className="prt-textarea fb"
                  value={htlMsgText}
                  onChange={e=>setHtlMsgText(e.target.value)}
                  placeholder="Votre message…"
                  rows={5}
                  style={{resize:'vertical'}}
                />
                {htlMsgSent&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:'#10B981'}}>✓ Message envoyé à l'équipe Locally.</div>}
                {htlMsgErr&&<div className="prt-err fb">{htlMsgErr}</div>}
                <div>
                  <button className="prt-btn-primary fb" onClick={sendHtlMessage} disabled={sendingHtlMsg||!htlMsgText.trim()}>
                    {sendingHtlMsg?'Envoi…':'Envoyer à Locally'}
                  </button>
                </div>
              </div>
            )}

            {tab==='parametres'&&(
              <div style={{maxWidth:520,display:'flex',flexDirection:'column',gap:32}}>
                <div>
                  <div className="prt-section-label fb">Informations de l'établissement</div>
                  <div style={{display:'flex',flexDirection:'column',gap:14,marginTop:4}}>
                    {[['nom','Nom de l\'hôtel','text','Grand Hôtel'],['type','Type','text','Hôtel 4 étoiles'],['telephone','Téléphone','text','05 56 00 00 00'],['email','Email','email','contact@hotel.fr']].map(([name,label,type,ph])=>(
                      <div key={name}>
                        <label className="prt-label fb">{label}</label>
                        <input className="prt-input" type={type} value={htlProfileForm[name]||''} onChange={e=>setHtlProfileForm(f=>({...f,[name]:e.target.value}))} placeholder={ph}/>
                      </div>
                    ))}
                    {htlProfileErr&&<div className="prt-err fb">{htlProfileErr}</div>}
                    <button className="prt-btn-primary fb" onClick={saveHtlProfile} disabled={savingHtlProfile||!htlProfileForm.nom.trim()}>
                      {htlProfileSaved?'✓ Sauvegardé':savingHtlProfile?'Sauvegarde…':'Sauvegarder'}
                    </button>
                  </div>
                </div>
                <div style={{borderTop:'1px solid rgba(107,29,29,.1)',paddingTop:28}}>
                  <div className="prt-section-label fb">Changer mon code d'accès</div>
                  <div style={{display:'flex',flexDirection:'column',gap:14,marginTop:4}}>
                    <input className="prt-input" type="password" value={htlCodeForm.code1} onChange={e=>{setHtlCodeForm(f=>({...f,code1:e.target.value}));setHtlCodeErr('');}} placeholder="Nouveau code d'accès (min. 6 car.)"/>
                    <input className="prt-input" type="password" value={htlCodeForm.code2} onChange={e=>{setHtlCodeForm(f=>({...f,code2:e.target.value}));setHtlCodeErr('');}} placeholder="Confirmer le code"/>
                    {htlCodeErr&&<div className="prt-err fb">{htlCodeErr}</div>}
                    <button className="prt-btn-primary fb" onClick={saveHtlAccessCode} disabled={savingHtlCode||!htlCodeForm.code1||!htlCodeForm.code2}>
                      {htlCodeSaved?'✓ Code mis à jour':savingHtlCode?'Enregistrement…':'Changer le code'}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
}

// ─── Auth ──────────────────────────────────────────────────────────────────

function useAuth(){
  const[user,setUser]=useState(null);
  const[profile,setProfile]=useState(null);
  const[authLoading,setAuthLoading]=useState(true);

  async function loadProfile(uid,userMeta=null){
    const{data}=await supabase.from('profiles').select('*').eq('id',uid).maybeSingle();
    if(data){setProfile(data);setAuthLoading(false);return;}
    // Profil absent — le créer depuis user_metadata si le prenom y est stocké
    // (cas confirmation email : le profil n'a pas pu être inséré lors de l'inscription)
    if(userMeta?.prenom){
      await supabase.from('profiles').insert({
        id:uid,prenom:userMeta.prenom,rgpd_consent_at:new Date().toISOString()
      });
      const{data:created}=await supabase.from('profiles').select('*').eq('id',uid).maybeSingle();
      setProfile(created);
    }
    setAuthLoading(false);
  }

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      const u=session?.user??null;
      setUser(u);
      if(u)loadProfile(u.id,u.user_metadata);
      else setAuthLoading(false);
    });
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{
      const u=session?.user??null;
      setUser(u);
      if(u)loadProfile(u.id,u.user_metadata);
      else{setProfile(null);setAuthLoading(false);}
    });
    return()=>subscription.unsubscribe();
  },[]);

  async function signOut(){
    await supabase.auth.signOut();
    setUser(null);setProfile(null);
  }

  return{user,profile,authLoading,signOut,setUser,setProfile};
}

function SessionBar({profile,onRenew,renewed}){
  const[rem,setRem]=useState(()=>profile?.session_expires_at?new Date(profile.session_expires_at)-Date.now():null);
  useEffect(()=>{
    if(!profile?.session_expires_at)return;
    const tick=()=>setRem(new Date(profile.session_expires_at)-Date.now());
    tick();
    const id=setInterval(tick,30000);
    return()=>clearInterval(id);
  },[profile?.session_expires_at]);
  if(rem===null)return null;
  const expired=rem<=0;
  const warn=!expired&&rem<2*3600000;
  const pct=expired?0:Math.min(100,rem/864e5*100);
  const fillColor=expired?'#B91C1C':warn?'#B45309':'#15803D';
  const h=expired?0:Math.floor(rem/3600000);
  const m=expired?0:Math.floor((rem%3600000)/60000);
  const timeStr=h>0?`${h}h ${m}m`:`${m}m`;
  const labelText=expired?'Session expirée · Renouveler':warn?`${timeStr} · Renouveler`:`${timeStr} restantes`;
  const labelColor=expired?'#B91C1C':warn?'#B45309':'#9B8B7A';
  return(
    <div onClick={onRenew} title="Cliquez pour renouveler votre session" style={{cursor:'pointer',userSelect:'none',width:'100%',display:'block'}}>
      <div style={{width:'100%',height:3,background:'#F0EBE5',overflow:'hidden'}}>
        <div style={{height:'100%',width:`${pct}%`,background:fillColor,transition:'width 1s linear'}}/>
      </div>
      <div style={{paddingRight:16,paddingTop:3,textAlign:'right',fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:300,color:renewed?'#10B981':labelColor,letterSpacing:'.01em',lineHeight:1}}>
        {renewed?'✓ Session renouvelée — 24h actives':labelText}
      </div>
    </div>
  );
}

function ResetPasswordPage({onDone}){
  const[ready,setReady]=useState(false);
  const[newPwd,setNewPwd]=useState('');
  const[confirmPwd,setConfirmPwd]=useState('');
  const[loading,setLoading]=useState(false);
  const[err,setErr]=useState('');
  const[done,setDone]=useState(false);
  useEffect(()=>{
    const hash=new URLSearchParams(window.location.hash.slice(1));
    if(hash.get('type')==='recovery')setReady(true);
    const{data:{subscription}}=supabase.auth.onAuthStateChange((event)=>{
      if(event==='PASSWORD_RECOVERY')setReady(true);
    });
    return()=>subscription.unsubscribe();
  },[]);
  async function handleSubmit(e){
    e.preventDefault();setErr('');
    if(newPwd.length<8){setErr('Le mot de passe doit contenir au moins 8 caractères.');return;}
    if(newPwd!==confirmPwd){setErr('Les mots de passe ne correspondent pas.');return;}
    setLoading(true);
    const{error}=await supabase.auth.updateUser({password:newPwd});
    setLoading(false);
    if(error){setErr('Une erreur est survenue. Réessayez.');return;}
    setDone(true);
    setTimeout(()=>onDone(),2000);
  }
  return(
    <div style={{minHeight:'100dvh',background:'#F7F3EE',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px 24px',textAlign:'center'}}>
      <style>{CSS}</style>
      <div style={{maxWidth:400,width:'100%'}}>
        <div className="sec-title fd" style={{marginBottom:24}}>Nouveau <em>mot de passe</em></div>
        {done?(
          <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,color:'#15803D',lineHeight:1.75}}>✓ Mot de passe modifié avec succès.<br/>Redirection en cours…</div>
        ):!ready?(
          <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,color:'#7A6555'}}>Vérification en cours…</div>
        ):(
          <form onSubmit={handleSubmit} noValidate style={{textAlign:'left'}}>
            {err&&<div className="auth-err fb">{err}</div>}
            <label className="auth-label fb">Nouveau mot de passe</label>
            <input className="auth-input fb" type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} placeholder="8 caractères minimum" required autoComplete="new-password" autoFocus/>
            <label className="auth-label fb">Confirmer le mot de passe</label>
            <input className="auth-input fb" type="password" value={confirmPwd} onChange={e=>setConfirmPwd(e.target.value)} placeholder="••••••••" required autoComplete="new-password"/>
            <button className="auth-btn fb" type="submit" disabled={loading||!newPwd||!confirmPwd}>
              {loading?'Enregistrement…':'Modifier le mot de passe →'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function RenouvellerPage({onBack,profile}){
  const active=profile?.session_expires_at&&new Date(profile.session_expires_at)>new Date();
  const msg=active
    ?'Votre session est active. Pour renouveler vos 24h, scannez le QR code affiché dans votre chambre.'
    :'Votre session a expiré. Scannez le QR code affiché dans votre chambre pour obtenir 24h de réductions chez nos partenaires.';
  return(
    <div style={{minHeight:'100dvh',background:'#F7F3EE',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px 24px',textAlign:'center'}}>
      <style>{CSS}</style>
      <div style={{maxWidth:400}}>
        <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:500,letterSpacing:'.18em',textTransform:'uppercase',color:'#6B1D1D',marginBottom:12}}>
          {active?'Session active':'Session expirée'}
        </div>
        <div className="sec-title fd" style={{marginBottom:20}}>Votre <em>session</em></div>
        <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:300,color:'#7A6555',lineHeight:1.75,marginBottom:32}}>{msg}</p>
        <button className="nav-auth-btn fb" onClick={onBack} style={{padding:'12px 28px',fontSize:14}}>← Retour</button>
      </div>
    </div>
  );
}

function CommentCaMarchePage({onHome}){
  const [openFaq,setOpenFaq]=useState(null);
  const faqs=[
    ["Combien de fois puis-je utiliser Locally ?","Autant de fois que vous voulez pendant votre séjour. Rescannez le QR code de votre chambre toutes les 24h pour renouveler votre accès."],
    ["Est-ce que je dois payer quelque chose ?","Non, Locally est totalement gratuit pour vous. Les réductions sont offertes par les partenaires locaux."],
    ["Que se passe-t-il si mon QR code expire ?","Générez-en simplement un nouveau depuis la page du partenaire."],
    ["Les partenaires sont-ils vérifiés ?","Oui, chaque commerce est sélectionné et approuvé manuellement par notre équipe avant d'apparaître sur Locally."],
  ];
  return(
    <div style={{background:"#F7F3EE",minHeight:"100vh"}}>
      <style>{CSS}</style>
      <div className="ccm-page">
        <button className="ccm-back fb" onClick={onHome}>← Retour</button>

        <div className="sec-tag fb">Le principe</div>
        <div className="sec-title fd" style={{marginBottom:24}}>Comment ça <em>marche</em> ?</div>

        <p className="ccm-intro">
          Locally connecte les voyageurs aux meilleurs commerces locaux de Bordeaux via un système de QR codes exclusifs négociés par votre hôtel.
        </p>

        <div className="ccm-section-title fd">En détail — 5 étapes</div>
        <ol className="ccm-steps">
          {[
            "Vous arrivez dans votre hôtel et scannez le QR code Locally affiché dans votre chambre.",
            "Vous créez votre compte gratuit en 30 secondes.",
            "Vous avez 24h pour profiter des réductions — rescannez le QR de votre chambre pour renouveler.",
            "Vous choisissez un partenaire et générez votre QR code personnalisé.",
            "Vous présentez votre QR à l'accueil du commerce et profitez de votre réduction immédiatement.",
          ].map((step,i)=>(
            <li className="ccm-step-item" key={i}>
              <span className="ccm-step-num">{i+1}</span>
              <span className="ccm-step-text fb">{step}</span>
            </li>
          ))}
        </ol>

        <div className="ccm-section-title fd">Vos avantages</div>
        <div className="ccm-avantages">
          {[
            "Réductions exclusives négociées par votre hôtel",
            "100% gratuit pour vous",
            "Partenaires sélectionnés et vérifiés",
            "Historique de vos visites dans votre espace compte",
          ].map(a=>(
            <div className="ccm-avantage" key={a}>
              <div className="ccm-avantage-dot"/>
              <span className="fb">{a}</span>
            </div>
          ))}
        </div>

        <div className="ccm-section-title fd">Questions fréquentes</div>
        <div className="ccm-faq">
          {faqs.map(([q,a],i)=>(
            <div className="ccm-faq-item" key={i}>
              <button className="ccm-faq-q fb" onClick={()=>setOpenFaq(openFaq===i?null:i)}>
                <span>{q}</span>
                <span style={{fontSize:16,color:'rgba(107,29,29,.4)',flexShrink:0}}>{openFaq===i?'−':'+'}</span>
              </button>
              {openFaq===i&&<div className="ccm-faq-a fb">{a}</div>}
            </div>
          ))}
        </div>
      </div>
      <SiteFooter/>
    </div>
  );
}

function AuthModal({onClose,onSuccess,defaultTab='login'}){
  const[tab,setTab]=useState(defaultTab);
  const[loading,setLoading]=useState(false);
  const[err,setErr]=useState('');
  const[info,setInfo]=useState('');
  const[loginEmail,setLoginEmail]=useState('');
  const[loginPwd,setLoginPwd]=useState('');
  const[regPrenom,setRegPrenom]=useState('');
  const[regEmail,setRegEmail]=useState('');
  const[regPwd,setRegPwd]=useState('');
  const[regPwd2,setRegPwd2]=useState('');
  const[rgpd,setRgpd]=useState(false);
  const[resendCooldown,setResendCooldown]=useState(0);
  const[resendOk,setResendOk]=useState(false);
  const[forgotMode,setForgotMode]=useState(false);
  const[resetEmail,setResetEmail]=useState('');
  const[resetSent,setResetSent]=useState(false);

  function xlErr(msg){
    if(!msg)return'Une erreur est survenue.';
    const m=msg.toLowerCase();
    if(m.includes('invalid login credentials')||m.includes('invalid credentials'))return'Email ou mot de passe incorrect.';
    if(m.includes('already registered')||m.includes('already exists')||m.includes('user already registered'))return'Un compte existe déjà avec cet email.';
    if(m.includes('password should be at least'))return'Le mot de passe doit contenir au moins 6 caractères.';
    if(m.includes('unable to validate email')||m.includes('invalid email'))return'Adresse email invalide.';
    if(m.includes('email rate limit')||m.includes('rate limit'))return'Trop de tentatives. Réessayez dans quelques minutes.';
    if(m.includes('user not found'))return'Aucun compte trouvé avec cet email.';
    if(m.includes('email not confirmed'))return'Email non confirmé. Vérifiez votre boîte mail.';
    if(m.includes('signup disabled'))return'Les inscriptions sont momentanément désactivées.';
    if(m.includes('weak password'))return'Mot de passe trop faible. Choisissez-en un plus sécurisé.';
    return'Une erreur est survenue. Réessayez ou contactez contact@mylocally.fr.';
  }

  async function handleLogin(e){
    e.preventDefault();setErr('');setLoading(true);
    const{data,error}=await supabase.auth.signInWithPassword({email:loginEmail.trim(),password:loginPwd});
    if(error){setErr(xlErr(error.message));setLoading(false);return;}
    const{data:prof}=await supabase.from('profiles').select('*').eq('id',data.user.id).maybeSingle();
    setLoading(false);
    onSuccess(data.user,prof);
  }

  async function handleResend(){
    if(resendCooldown>0)return;
    await supabase.auth.resend({type:'signup',email:regEmail.trim()});
    setResendOk(true);setTimeout(()=>setResendOk(false),3000);
    setResendCooldown(60);
    const iv=setInterval(()=>{
      setResendCooldown(c=>{if(c<=1){clearInterval(iv);return 0;}return c-1;});
    },1000);
  }

  async function handleResetPassword(e){
    e.preventDefault();setErr('');
    if(!resetEmail.trim()){setErr('Veuillez saisir votre adresse email.');return;}
    if(!/\S+@\S+\.\S+/.test(resetEmail.trim())){setErr('Adresse email invalide.');return;}
    setLoading(true);
    const{error}=await supabase.auth.resetPasswordForEmail(resetEmail.trim(),{redirectTo:'https://locally-gules.vercel.app/reset-password'});
    setLoading(false);
    if(error){setErr(xlErr(error.message));return;}
    setResetSent(true);
  }

  async function handleRegister(e){
    e.preventDefault();setErr('');
    if(!regPrenom.trim()||regPrenom.trim().length<2){setErr('Le prénom doit contenir au moins 2 caractères.');return;}
    if(regPwd.length<8){setErr('Le mot de passe doit contenir au moins 8 caractères.');return;}
    if(regPwd!==regPwd2){setErr('Les mots de passe ne correspondent pas.');return;}
    if(!rgpd){setErr('Vous devez accepter la politique de confidentialité pour créer un compte.');return;}
    setLoading(true);
    const{data,error}=await supabase.auth.signUp({email:regEmail.trim(),password:regPwd,options:{data:{prenom:regPrenom.trim()}}});
    if(error){setErr(xlErr(error.message));setLoading(false);return;}
    if(!data.session){
      setLoading(false);
      setInfo('Un email de confirmation vous a été envoyé. Vérifiez votre boîte mail puis revenez vous connecter.');
      setTab('login');
      return;
    }
    const session_expires_at=new Date(Date.now()+24*60*60*1000).toISOString();
    await supabase.from('profiles').insert({id:data.user.id,prenom:regPrenom.trim(),session_expires_at,rgpd_consent_at:new Date().toISOString()});
    const{data:prof}=await supabase.from('profiles').select('*').eq('id',data.user.id).maybeSingle();
    setLoading(false);
    onSuccess(data.user,prof);
  }

  return(
    <div className="auth-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="auth-card">
        <button className="auth-close" onClick={onClose}>×</button>
        {forgotMode?(
          <>
            <div className="auth-title fd">Réinitialiser votre <em>mot de passe</em></div>
            {!resetSent?(
              <>
                <div className="auth-sub fb">Saisissez votre email pour recevoir un lien de réinitialisation.</div>
                {err&&<div className="auth-err fb">{err}</div>}
                <form onSubmit={handleResetPassword} noValidate>
                  <label className="auth-label fb">Email</label>
                  <input className="auth-input fb" type="email" value={resetEmail} onChange={e=>setResetEmail(e.target.value)} placeholder="votre@email.fr" required autoComplete="email" autoFocus/>
                  <button className="auth-btn fb" type="submit" disabled={loading||!resetEmail.trim()}>
                    {loading?'Envoi…':'Envoyer le lien →'}
                  </button>
                </form>
              </>
            ):(
              <div className="auth-ok fb" style={{marginTop:16}}>Email envoyé ! Vérifiez votre boîte mail.</div>
            )}
            <div className="auth-switch fb">
              <button className="auth-switch-btn fb" onClick={()=>{setForgotMode(false);setErr('');setResetSent(false);}}>← Retour à la connexion</button>
            </div>
          </>
        ):(
          <>
            <div className="auth-title fd">{tab==='login'?<>Bon retour <em>!</em></>:<>Rejoindre <em>Locally</em></>}</div>
            <div className="auth-sub fb">{tab==='login'?'Connectez-vous pour générer votre QR code.':'Créez votre compte pour profiter des réductions.'}</div>
            <div className="auth-tabs">
              <button className={'auth-tab fb'+(tab==='login'?' active':'')} onClick={()=>{setTab('login');setErr('');setInfo('');}}>Se connecter</button>
              <button className={'auth-tab fb'+(tab==='register'?' active':'')} onClick={()=>{setTab('register');setErr('');setInfo('');}}>Créer un compte</button>
            </div>

            {err&&<div className="auth-err fb">{err}</div>}
            {info&&(
              <div>
                <div className="auth-ok fb">{info}</div>
                <div style={{marginTop:10,textAlign:'center'}}>
                  {resendOk&&<div style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:'#10B981',marginBottom:6}}>✓ Email renvoyé !</div>}
                  <button className="auth-switch-btn fb" onClick={handleResend} disabled={resendCooldown>0} style={{opacity:resendCooldown>0?0.45:1}}>
                    {resendCooldown>0?`Renvoyer l'email (${resendCooldown}s)`:"Renvoyer l'email de confirmation"}
                  </button>
                </div>
              </div>
            )}

            {tab==='login'?(
              <form onSubmit={handleLogin} noValidate>
                <label className="auth-label fb">Email</label>
                <input className="auth-input fb" type="email" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} placeholder="votre@email.fr" required autoComplete="email" autoFocus/>
                <label className="auth-label fb">Mot de passe</label>
                <input className="auth-input fb" type="password" value={loginPwd} onChange={e=>setLoginPwd(e.target.value)} placeholder="••••••••" required autoComplete="current-password"/>
                <div style={{textAlign:'right',marginTop:-8,marginBottom:12}}>
                  <button type="button" className="auth-rgpd-link" onClick={()=>{setForgotMode(true);setResetEmail(loginEmail);setErr('');setResetSent(false);}}>Mot de passe oublié ?</button>
                </div>
                <button className="auth-btn fb" type="submit" disabled={loading||!loginEmail||!loginPwd}>
                  {loading?'Connexion…':'Se connecter →'}
                </button>
              </form>
            ):(
              <form onSubmit={handleRegister} noValidate>
                <label className="auth-label fb">Prénom</label>
                <input className="auth-input fb" type="text" value={regPrenom} onChange={e=>setRegPrenom(e.target.value)} placeholder="Votre prénom" required maxLength={50} autoFocus/>
                <label className="auth-label fb">Email</label>
                <input className="auth-input fb" type="email" value={regEmail} onChange={e=>setRegEmail(e.target.value)} placeholder="votre@email.fr" required autoComplete="email"/>
                <label className="auth-label fb">Mot de passe</label>
                <input className="auth-input fb" type="password" value={regPwd} onChange={e=>setRegPwd(e.target.value)} placeholder="8 caractères minimum" required autoComplete="new-password"/>
                <label className="auth-label fb">Confirmer le mot de passe</label>
                <input className="auth-input fb" type="password" value={regPwd2} onChange={e=>setRegPwd2(e.target.value)} placeholder="••••••••" required autoComplete="new-password"/>
                <div className="auth-rgpd">
                  <input className="auth-rgpd-check" type="checkbox" id="auth-rgpd" checked={rgpd} onChange={e=>setRgpd(e.target.checked)}/>
                  <label htmlFor="auth-rgpd" className="auth-rgpd-text fb">
                    J'accepte que mes données (email, prénom, historique de visites) soient utilisées pour le fonctionnement du service Locally, conformément à la{' '}
                    <button type="button" className="auth-rgpd-link" onClick={()=>siteNav('/confidentialite')}>politique de confidentialité</button>.
                  </label>
                </div>
                <button className="auth-btn fb" type="submit" disabled={loading||!regPrenom||!regEmail||!regPwd||!regPwd2||!rgpd}>
                  {loading?'Création…':'Créer mon compte →'}
                </button>
              </form>
            )}

            <div className="auth-switch fb">
              {tab==='login'
                ?<>Pas encore de compte ?{' '}<button className="auth-switch-btn fb" onClick={()=>{setTab('register');setErr('');setInfo('');}}>Créer un compte</button></>
                :<>Déjà un compte ?{' '}<button className="auth-switch-btn fb" onClick={()=>{setTab('login');setErr('');setInfo('');}}>Se connecter</button></>
              }
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MonCompteView({user,profile,setProfile,signOut,onHome}){
  const[txns,setTxns]=useState([]);
  const[loading,setLoading]=useState(true);
  const[deleting,setDeleting]=useState(false);
  const[showConfirm,setShowConfirm]=useState(false);
  const[deleteErr,setDeleteErr]=useState('');

  useEffect(()=>{
    if(!user)return;
    supabase.from('transactions')
      .select('*')
      .eq('user_id',user.id)
      .order('created_at',{ascending:false})
      .then(async({data,error})=>{
        if(error||!data||data.length===0){setTxns([]);setLoading(false);return;}
        const ids=[...new Set(data.map(t=>t.partner_id).filter(Boolean))];
        if(ids.length===0){setTxns(data);setLoading(false);return;}
        const{data:cands}=await supabase.from('candidates').select('id,nom').in('id',ids);
        const byId={};(cands||[]).forEach(c=>{byId[c.id]=c.nom;});
        setTxns(data.map(t=>({...t,candidates:{nom:byId[t.partner_id]||null}})));
        setLoading(false);
      });
  },[user?.id]);

  async function handleDeleteAccount(){
    setDeleting(true);setDeleteErr('');
    const{data:{session}}=await supabase.auth.getSession();
    const{error}=await supabase.functions.invoke('delete-account',{
      headers:{Authorization:`Bearer ${session.access_token}`},
    });
    if(error){
      setDeleteErr('Erreur lors de la suppression. Contactez contact@mylocally.fr');
      setDeleting(false);return;
    }
    await signOut();
    onHome();
  }

  const totalVisites=txns.length;
  const totalEconomise=txns.reduce((s,t)=>s+t.montant_transaction*t.taux_reduction_applique/100,0);

  const row=(label,val)=>(
    <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:500,letterSpacing:'.18em',textTransform:'uppercase',color:'#6B1D1D',marginBottom:typeof val==='undefined'?0:16}}>{label}</div>
  );

  return(
    <div style={{background:'#F7F3EE',minHeight:'100vh'}}>
      <style>{CSS}</style>
      <div style={{background:'#1C1208',padding:'20px 28px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div className="htl-logo fd" style={{cursor:'pointer'}} onClick={onHome}>local<em>ly</em></div>
        <button className="htl-logout fb" onClick={()=>{signOut();onHome();}}>Déconnexion</button>
      </div>

      <div style={{maxWidth:720,margin:'0 auto',padding:'48px 24px 80px'}}>
        <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:500,letterSpacing:'.18em',textTransform:'uppercase',color:'#6B1D1D',marginBottom:8}}>Mon compte</div>
        <div className="sec-title fd" style={{marginBottom:36}}>Bonjour, <em>{profile?.prenom}</em></div>

        {/* Stat cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14,marginBottom:40}}>
          <div className="htl-stat-card">
            <div className="htl-stat-label fb">Visites totales</div>
            <div className="htl-stat-num fd">{totalVisites}</div>
            <div className="htl-stat-desc fb">transactions enregistrées</div>
          </div>
          <div className="htl-stat-card">
            <div className="htl-stat-label fb">Économies réalisées</div>
            <div className="htl-stat-num fd" style={{fontSize:totalEconomise>=100?28:36}}>{totalEconomise.toFixed(2)} €</div>
            <div className="htl-stat-desc fb">grâce à vos réductions</div>
          </div>
        </div>

        {/* Historique */}
        <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:500,letterSpacing:'.18em',textTransform:'uppercase',color:'#6B1D1D',marginBottom:16}}>Historique de mes visites</div>
        {loading?(
          <div className="fb" style={{color:'#7A6555',fontSize:13,padding:'16px 0'}}>Chargement…</div>
        ):txns.length===0?(
          <div className="fb" style={{color:'#7A6555',fontSize:13,padding:'32px 0',textAlign:'center',lineHeight:1.7}}>
            Aucune visite encore enregistrée.<br/>Scannez votre QR code chez un partenaire pour commencer.
          </div>
        ):(
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {txns.map(t=>{
              const paid=+(t.montant_transaction*(1-t.taux_reduction_applique/100)).toFixed(2);
              const saved=+(t.montant_transaction*t.taux_reduction_applique/100).toFixed(2);
              const date=new Date(t.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'});
              return(
                <div key={t.id} style={{background:'#FDFAF6',border:'1px solid rgba(107,29,29,.09)',borderRadius:14,padding:'18px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
                  <div>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:19,fontWeight:600,color:'#1C1208',marginBottom:3}}>{t.candidates?.nom||'Commerce'}</div>
                    <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:300,color:'#7A6555'}}>{date} · {t.taux_reduction_applique}% de réduction</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:500,color:'#1C1208'}}>{paid.toFixed(2)} €</div>
                    <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:300,color:'#2D6A4F'}}>− {saved.toFixed(2)} € économisés</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Suppression compte */}
        <div style={{marginTop:64,paddingTop:24,borderTop:'1px solid rgba(107,29,29,.08)'}}>
          {!showConfirm?(
            <button
              onClick={()=>setShowConfirm(true)}
              style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:300,color:'rgba(155,35,53,.42)',background:'none',border:'none',cursor:'pointer',padding:0,textDecoration:'underline',textDecorationColor:'rgba(155,35,53,.18)'}}>
              Supprimer mon compte et mes données
            </button>
          ):(
            <div style={{background:'rgba(155,35,53,.04)',border:'1px solid rgba(155,35,53,.12)',borderRadius:12,padding:'20px 24px'}}>
              <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:500,color:'#1C1208',marginBottom:8}}>Confirmer la suppression ?</div>
              <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:300,color:'#7A6555',marginBottom:18,lineHeight:1.65}}>
                Cette action est irréversible. Votre compte sera supprimé et vos données anonymisées conformément à notre politique de confidentialité.
              </div>
              {deleteErr&&<div className="auth-err fb" style={{marginBottom:14}}>{deleteErr}</div>}
              <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:500,background:'#9B2335',color:'#F7F3EE',border:'none',borderRadius:8,padding:'10px 20px',cursor:'pointer',opacity:deleting?.5:1,transition:'opacity .2s'}}>
                  {deleting?'Suppression en cours…':'Oui, supprimer définitivement'}
                </button>
                <button
                  onClick={()=>{setShowConfirm(false);setDeleteErr('');}}
                  style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:400,background:'none',color:'#7A6555',border:'1px solid rgba(107,29,29,.15)',borderRadius:8,padding:'10px 20px',cursor:'pointer'}}>
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function siteNav(path){
  window.history.pushState({},'' ,path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function SiteFooter(){
  return(
    <footer className="footer" style={{background:"#F7F3EE"}}>
      <div className="footer-logo fd">local<em>ly</em></div>
      <div className="footer-links">
        <button className="footer-link" onClick={()=>siteNav('/mentions-legales')}>Mentions légales</button>
        <button className="footer-link" onClick={()=>siteNav('/confidentialite')}>Confidentialité</button>
        <a className="footer-link" href="mailto:contact@mylocally.fr">Contact</a>
        <button className="footer-link footer-link-commerce" onClick={()=>siteNav('/rejoindre')}>Vous êtes commerçant ?</button>
      </div>
      <div className="footer-copy fb">© 2026 · Bordeaux · Tous droits réservés</div>
    </footer>
  );
}

function MentionsLegalesView({onHome}){
  return(
    <div style={{background:"#F7F3EE",minHeight:"100vh",padding:"80px 24px 64px",maxWidth:680,margin:"0 auto"}}>
      <style>{CSS}</style>
      <button className="visit-back fb" style={{marginBottom:32}} onClick={onHome}>← Retour</button>
      <div className="sec-tag fb">Légal</div>
      <div className="sec-title fd" style={{marginBottom:32}}>Mentions <em>légales</em></div>
      <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:300,color:"#7A6555",lineHeight:1.8,display:"flex",flexDirection:"column",gap:28}}>
        <div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:600,color:"#1C1208",marginBottom:8}}>Éditeur</div>
          <p>Locally — plateforme locale de réductions partenaires, Bordeaux, France.</p>
          <p>Contact : <a href="mailto:contact@mylocally.fr" style={{color:"#6B1D1D"}}>contact@mylocally.fr</a></p>
        </div>
        <div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:600,color:"#1C1208",marginBottom:8}}>Hébergement</div>
          <p>Ce site est hébergé par <strong>Vercel Inc.</strong>, 340 Pine Street, Suite 701, San Francisco, CA 94104, États-Unis.</p>
        </div>
        <div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:600,color:"#1C1208",marginBottom:8}}>Propriété intellectuelle</div>
          <p>L'ensemble des contenus présents sur ce site (textes, images, logotype) est la propriété exclusive de Locally et ne peut être reproduit sans autorisation préalable.</p>
        </div>
        <div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:600,color:"#1C1208",marginBottom:8}}>Responsabilité</div>
          <p>Locally s'efforce de maintenir les informations publiées à jour, mais ne peut garantir l'exactitude ou l'exhaustivité des contenus. L'utilisation du site se fait sous la responsabilité de l'utilisateur.</p>
        </div>
      </div>
    </div>
  );
}

function ConfidentialiteView({onHome}){
  const sec={fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:600,color:"#1C1208",marginBottom:8};
  return(
    <div style={{background:"#F7F3EE",minHeight:"100vh",padding:"80px 24px 64px",maxWidth:680,margin:"0 auto"}}>
      <style>{CSS}</style>
      <button className="visit-back fb" style={{marginBottom:32}} onClick={onHome}>← Retour</button>
      <div className="sec-tag fb">Légal</div>
      <div className="sec-title fd" style={{marginBottom:8}}>Politique de <em>confidentialité</em></div>
      <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:300,color:"#7A6555",marginBottom:32}}>Dernière mise à jour : juin 2026</p>
      <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:300,color:"#7A6555",lineHeight:1.8,display:"flex",flexDirection:"column",gap:28}}>
        <div>
          <div style={sec}>1. Responsable du traitement</div>
          <p>Locally, service opéré par un auto-entrepreneur basé à Bordeaux (France). Contact : <a href="mailto:contact@mylocally.fr" style={{color:"#6B1D1D"}}>contact@mylocally.fr</a>.</p>
        </div>
        <div>
          <div style={sec}>2. Données collectées</div>
          <p>Lors de la création d'un compte client, Locally collecte les données suivantes :</p>
          <ul style={{paddingLeft:20,marginTop:8,display:"flex",flexDirection:"column",gap:4}}>
            <li><strong>Adresse e-mail</strong> — utilisée pour l'authentification et les communications liées au compte.</li>
            <li><strong>Prénom</strong> — affiché sur les QR codes présentés aux partenaires.</li>
            <li><strong>Historique de transactions</strong> — détail des réductions obtenues chez les partenaires (commerce, montant, date).</li>
          </ul>
          <p style={{marginTop:8}}>Ces données sont fournies volontairement lors de la création du compte. La navigation sur le site sans compte ne génère aucune collecte de données personnelles.</p>
        </div>
        <div>
          <div style={sec}>3. Finalité du traitement</div>
          <p>Les données collectées sont utilisées exclusivement pour :</p>
          <ul style={{paddingLeft:20,marginTop:8,display:"flex",flexDirection:"column",gap:4}}>
            <li>Le <strong>fonctionnement du service</strong> : authentification, accès à l'espace personnel, gestion du compte.</li>
            <li>La <strong>génération des QR codes</strong> : identification du client lors de la validation chez un partenaire.</li>
            <li>Les <strong>statistiques partenaires et hôtels</strong> : agrégation anonymisée du nombre de passages et des réductions accordées (aucune donnée nominative transmise aux partenaires au-delà du prénom).</li>
          </ul>
          <p style={{marginTop:8}}>Ces données ne sont jamais revendues à des tiers, ni utilisées à des fins publicitaires.</p>
        </div>
        <div>
          <div style={sec}>4. Durée de conservation</div>
          <p>Les données personnelles (email, prénom, historique de transactions) sont conservées pendant <strong>2 ans à compter de la dernière activité</strong> sur le compte (dernière connexion ou dernière transaction enregistrée). À l'expiration de ce délai, les données sont supprimées ou anonymisées.</p>
        </div>
        <div>
          <div style={sec}>5. Suppression du compte</div>
          <p>Vous pouvez supprimer votre compte à tout moment selon deux modalités :</p>
          <ul style={{paddingLeft:20,marginTop:8,display:"flex",flexDirection:"column",gap:4}}>
            <li>Directement depuis votre <strong>espace Mon compte</strong> → section "Supprimer mon compte". La suppression est immédiate et irréversible.</li>
            <li>Par e-mail à <a href="mailto:contact@mylocally.fr" style={{color:"#6B1D1D"}}>contact@mylocally.fr</a>, avec pour objet « Suppression de compte ».</li>
          </ul>
          <p style={{marginTop:8}}>Lors de la suppression, votre email et prénom sont effacés. Les transactions passées sont conservées de manière anonymisée (sans lien avec votre identité) à des fins de comptabilité opérationnelle.</p>
        </div>
        <div>
          <div style={sec}>6. Vos droits (RGPD)</div>
          <p>Conformément au Règlement Général sur la Protection des Données (UE) 2016/679, vous disposez des droits suivants :</p>
          <ul style={{paddingLeft:20,marginTop:8,display:"flex",flexDirection:"column",gap:4}}>
            <li><strong>Droit d'accès</strong> : obtenir une copie de vos données personnelles.</li>
            <li><strong>Droit de rectification</strong> : corriger des informations inexactes.</li>
            <li><strong>Droit à l'effacement</strong> : demander la suppression de vos données.</li>
            <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré.</li>
            <li><strong>Droit d'opposition</strong> : vous opposer à un traitement particulier.</li>
          </ul>
          <p style={{marginTop:8}}>Pour exercer ces droits, contactez-nous à <a href="mailto:contact@mylocally.fr" style={{color:"#6B1D1D"}}>contact@mylocally.fr</a>. Nous nous engageons à répondre dans un délai de 30 jours. En cas de réclamation non résolue, vous pouvez saisir la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" style={{color:"#6B1D1D"}}>CNIL</a>.</p>
        </div>
        <div>
          <div style={sec}>7. Cookies et stockage local</div>
          <p>Ce site n'utilise pas de cookies à des fins publicitaires ou de tracking. Le stockage local du navigateur (localStorage) est utilisé uniquement pour mémoriser l'hôtel d'origine du visiteur pendant sa navigation, afin de permettre l'attribution des statistiques hôtelières. Cette information est effacée à la fermeture de la session ou sur simple demande.</p>
        </div>
        <div>
          <div style={sec}>8. Sécurité</div>
          <p>Les données sont hébergées sur l'infrastructure Supabase (Union Européenne). L'accès est protégé par authentification sécurisée. Les mots de passe ne sont jamais stockés en clair. Locally s'engage à prendre toutes les mesures raisonnables pour protéger vos données contre tout accès non autorisé.</p>
        </div>
      </div>
    </div>
  );
}

function JoindreView({onHome}){
  const [form,setForm]=useState({nom:'',categorie:'',categorie_autre:'',google_maps:'',telephone:'',description:'',reduction:'',email:'',infos_complementaires:''});
  const [joinHoraires,setJoinHoraires]=useState({});
  const [loading,setLoading]=useState(false);
  const [sent,setSent]=useState(false);
  const [err,setErr]=useState('');
  function handleChange(e){const{name,value}=e.target;setForm(f=>({...f,[name]:value}));}
  function setJoinDay(day,key,val){setJoinHoraires(h=>{const d=h[day]||{ouvert:false,creneaux:[["",""]]};const cr=Array.isArray(d.creneaux)?d.creneaux:[["",""]];return{...h,[day]:{...d,creneaux:cr,[key]:val}};});}
  function setJoinDayTime(day,si,ti,val){setJoinHoraires(h=>{const d={...(h[day]||{ouvert:false,creneaux:[["",""]]})};const cr=(Array.isArray(d.creneaux)?d.creneaux:[["",""]]).map((s,i)=>i===si?s.map((t,j)=>j===ti?val:t):s);return{...h,[day]:{...d,creneaux:cr}};});}
  function addJoinDaySlot(day){setJoinHoraires(h=>{const d={...(h[day]||{ouvert:false,creneaux:[["",""]]})};const cr=Array.isArray(d.creneaux)?d.creneaux:[["",""]];if(cr.length>=2)return h;return{...h,[day]:{...d,creneaux:[...cr,["",""]]}};});}
  function removeJoinDaySlot(day){setJoinHoraires(h=>{const d={...(h[day]||{ouvert:false,creneaux:[["",""]]})};const cr=Array.isArray(d.creneaux)?d.creneaux:[["",""]];return{...h,[day]:{...d,creneaux:cr.slice(0,1)}};});}
  async function handleSubmit(e){
    e.preventDefault();
    setErr('');
    if(form.categorie==='Autre'&&!form.categorie_autre.trim()){setErr('Veuillez préciser la catégorie.');return;}
    if(!form.reduction.trim()){setErr('Veuillez indiquer une réduction.');return;}
    setLoading(true);
    try{
      const cat=form.categorie==='Autre'?form.categorie_autre.trim():form.categorie;
      const reduction=form.reduction.trim()+'%';
      const{error}=await supabase.from('candidates').insert([{
        nom:form.nom.trim(),
        categorie:cat,
        google_maps:form.google_maps.trim(),
        telephone:form.telephone.trim(),
        description:form.description.trim(),
        reduction,
        email:form.email.trim(),
        horaires:Object.keys(joinHoraires).length?joinHoraires:null,
        infos_complementaires:form.infos_complementaires.trim()||null,
        status:'pending'
      }]);
      if(error)throw error;
      setSent(true);
    }catch(e){
      setErr('Une erreur est survenue. Veuillez réessayer.');
    }finally{
      setLoading(false);
    }
  }
  return(
    <div className="join-wrap">
      <style>{CSS}</style>
      <div className="join-logo fd" onClick={onHome}>local<em>ly</em></div>
      <div className="join-card">
        {sent?(
          <div className="join-success">
            <div className="join-success-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6B1D1D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div className="join-success-title fd">Candidature envoyée</div>
            <div className="join-success-desc fb">Merci pour votre intérêt. Nous examinerons votre dossier et vous recontacterons sous 48h.</div>
          </div>
        ):(
          <>
            <div className="join-title fd">Rejoindre <em>Locally</em></div>
            <div className="join-sub fb">Vous souhaitez mettre votre commerce en avant et proposer des avantages exclusifs à nos clients ? Remplissez ce formulaire.</div>
            <form onSubmit={handleSubmit} noValidate>
              <div className="join-field">
                <div className="join-label fb">Nom de l'établissement</div>
                <input className="join-input fb" name="nom" value={form.nom} onChange={handleChange} placeholder="Le Café du Marché" required maxLength={100}/>
              </div>
              <div className="join-field">
                <div className="join-label fb">Catégorie</div>
                <select className="join-select fb" name="categorie" value={form.categorie} onChange={handleChange} required>
                  <option value="" disabled>Choisir une catégorie</option>
                  <option>Restauration</option>
                  <option>Boulangerie</option>
                  <option>Sport</option>
                  <option>Bien-être</option>
                  <option>Activité</option>
                  <option>Autre</option>
                </select>
              </div>
              {form.categorie==='Autre'&&(
                <div className="join-field">
                  <div className="join-label fb">Précisez la catégorie</div>
                  <input className="join-input fb" name="categorie_autre" value={form.categorie_autre} onChange={handleChange} placeholder="Ex: Librairie, Fleuriste…" required maxLength={80}/>
                </div>
              )}
              <div className="join-field">
                <div className="join-label fb">Adresse</div>
                <input className="join-input fb" name="google_maps" value={form.google_maps} onChange={handleChange} placeholder="Ex: 12 Rue de la Paix, Bordeaux" required maxLength={500}/>
              </div>
              <div className="join-field">
                <div className="join-label fb">Numéro de téléphone</div>
                <input className="join-input fb" name="telephone" type="tel" value={form.telephone} onChange={handleChange} placeholder="06 00 00 00 00" required maxLength={20}/>
              </div>
              <div className="join-field">
                <div className="join-label fb">Description courte</div>
                <textarea className="join-textarea fb" name="description" value={form.description} onChange={handleChange} placeholder="Décrivez votre établissement en quelques mots…" required/>
              </div>
              <div className="join-field">
                <div className="join-label fb">Réduction proposée</div>
                <div className="join-input-group">
                  <input className="join-input fb" type="number" name="reduction" min="1" max="100" value={form.reduction} onChange={handleChange} placeholder="10" required style={{MozAppearance:'textfield'}}/>
                  <span className="join-input-suffix fb">%</span>
                </div>
              </div>
              <div className="join-field">
                <div className="join-label fb">Horaires d'ouverture</div>
                <div className="prt-hours-grid">
                  {DAYS.map(day=>{
                    const h=joinHoraires[day]||{ouvert:false,creneaux:[["",""]]};
                    const cr=Array.isArray(h.creneaux)&&h.creneaux.length?h.creneaux:[["",""]];
                    return(
                      <div key={day} className="prt-hours-row" style={{alignItems:'flex-start'}}>
                        <div className="prt-hours-day-name fb" style={{paddingTop:6}}>{day}</div>
                        <div className="prt-hours-toggle" style={{flexShrink:0,paddingTop:4}}>
                          <button type="button" className={'prt-hours-toggle-btn fb'+(h.ouvert?' on':'')} onClick={()=>setJoinDay(day,'ouvert',true)}>Ouvert</button>
                          <button type="button" className={'prt-hours-toggle-btn fb'+(!h.ouvert?' on':'')} onClick={()=>setJoinDay(day,'ouvert',false)}>Fermé</button>
                        </div>
                        {h.ouvert&&(
                          <div className="prt-hours-slots">
                            {cr.map((slot,si)=>(
                              <div key={si} className="prt-hours-slot-row">
                                <input className="prt-hours-time fb" type="time" value={slot[0]||''} onChange={e=>setJoinDayTime(day,si,0,e.target.value)}/>
                                <span className="prt-hours-time-sep fb">→</span>
                                <input className="prt-hours-time fb" type="time" value={slot[1]||''} onChange={e=>setJoinDayTime(day,si,1,e.target.value)}/>
                                {si===0&&cr.length<2&&<button type="button" className="prt-hours-slot-add fb" onClick={()=>addJoinDaySlot(day)}>+ 2ème créneau</button>}
                                {si>0&&<button type="button" className="prt-hours-slot-rm" onClick={()=>removeJoinDaySlot(day)}>×</button>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="join-field">
                <div className="join-label fb">Informations complémentaires <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,color:'rgba(122,101,85,.45)',textTransform:'none',letterSpacing:0,fontWeight:300,marginLeft:4}}>— optionnel</span></div>
                <textarea className="join-textarea fb" name="infos_complementaires" value={form.infos_complementaires} onChange={handleChange} placeholder="Ex: Fermé les jours fériés, congés du 1 au 15 août…" maxLength={300}/>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:'rgba(122,101,85,.35)',textAlign:'right',marginTop:4}}>{form.infos_complementaires.length}/300</div>
              </div>
              <div className="join-field">
                <div className="join-label fb">Email de contact</div>
                <input className="join-input fb" name="email" type="email" value={form.email} onChange={handleChange} placeholder="contact@moncommerce.fr" required maxLength={150}/>
              </div>
              {err&&<div className="join-err fb">{err}</div>}
              <button type="submit" className="join-submit fb" disabled={loading}>
                {loading?'Envoi en cours…':'Envoyer ma candidature →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function CartePage({partners,user,profile,onNavigatePartner,onBack}){
  const mapRef=useRef(null);
  const mapInstanceRef=useRef(null);
  const sessionActive=!!(profile?.session_expires_at&&new Date(profile.session_expires_at)>new Date());

  useEffect(()=>{
    if(!user||!sessionActive)return;
    function initMap(){
      if(mapInstanceRef.current||!mapRef.current)return;
      const L=window.L;
      const map=L.map(mapRef.current,{zoomControl:true}).setView([44.8378,-0.5792],14);
      mapInstanceRef.current=map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
        maxZoom:19,
      }).addTo(map);
      const pinIcon=L.divIcon({
        html:`<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 0C6.268 0 0 6.268 0 14c0 9.625 14 22 14 22s14-12.375 14-22C28 6.268 21.732 0 14 0z" fill="#6B1D1D"/><circle cx="14" cy="14" r="5.5" fill="white" opacity=".9"/></svg>`,
        iconSize:[28,36],iconAnchor:[14,36],popupAnchor:[0,-38],className:'',
      });
      window.__locally_nav=(partnerId)=>{
        const p=(partners||[]).find(x=>x.id===partnerId);
        if(p)onNavigatePartner('generic',p);
      };
      (partners||[]).filter(p=>p.latitude&&p.longitude).forEach(p=>{
        const r=p.reduction||'';
        L.marker([p.latitude,p.longitude],{icon:pinIcon}).addTo(map).bindPopup(
          `<div style="font-family:'DM Sans',sans-serif;min-width:190px;padding:4px 2px">
            <div style="font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:600;color:#1C1208;margin-bottom:3px">${p.nom}</div>
            <div style="font-size:11px;color:#9B8B7A;margin-bottom:${r?'4px':'12px'}">${p.categorie||''}</div>
            ${r?`<div style="font-size:12px;font-weight:500;color:#6B1D1D;margin-bottom:12px">${r}</div>`:''}
            <button onclick="window.__locally_nav('${p.id}')" style="font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;background:#1C1208;color:#F7F3EE;border:none;border-radius:7px;padding:8px 14px;cursor:pointer;width:100%">Voir ce partenaire →</button>
          </div>`,{maxWidth:240}
        );
      });
      navigator.geolocation?.getCurrentPosition(pos=>{
        const{latitude,longitude}=pos.coords;
        map.setView([latitude,longitude],15);
        L.marker([latitude,longitude],{icon:L.divIcon({
          html:`<div style="width:14px;height:14px;background:#2563EB;border:2.5px solid white;border-radius:50%;box-shadow:0 0 0 5px rgba(37,99,235,.18)"></div>`,
          iconSize:[14,14],iconAnchor:[7,7],className:'',
        })}).addTo(map).bindPopup('<span style="font-family:\'DM Sans\',sans-serif;font-size:13px">Vous êtes ici</span>');
      },()=>{});
    }
    if(window.L){initMap();return;}
    if(!document.querySelector('#leaflet-css')){
      const link=document.createElement('link');
      link.id='leaflet-css';link.rel='stylesheet';
      link.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(link);
    }
    let script=document.querySelector('#leaflet-js');
    if(!script){
      script=document.createElement('script');
      script.id='leaflet-js';
      script.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      document.head.appendChild(script);
    }
    script.addEventListener('load',initMap,{once:true});
    return()=>{
      if(mapInstanceRef.current){mapInstanceRef.current.remove();mapInstanceRef.current=null;}
      delete window.__locally_nav;
    };
  },[]);

  if(!user||!profile) return(
    <div style={{minHeight:'calc(100dvh - 64px)',background:'#FDFAF6',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:32,textAlign:'center'}}>
      <div className="sec-title fd" style={{marginBottom:12}}>Accès <em>réservé</em></div>
      <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:300,color:'#7A6555',maxWidth:320,lineHeight:1.7,marginBottom:24}}>Connectez-vous pour accéder à la carte des partenaires Locally.</div>
      <button className="btn-primary fb" onClick={onBack}>Retour à l'accueil</button>
    </div>
  );
  if(!sessionActive) return(
    <div style={{minHeight:'calc(100dvh - 64px)',background:'#FDFAF6',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:32,textAlign:'center'}}>
      <div className="sec-title fd" style={{marginBottom:12}}>Session <em>expirée</em></div>
      <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:300,color:'#7A6555',maxWidth:320,lineHeight:1.7,marginBottom:24}}>Scannez le QR code de votre chambre pour renouveler vos 24h et accéder à la carte.</div>
      <button className="btn-primary fb" onClick={()=>siteNav('/renouveler')}>Renouveler →</button>
    </div>
  );
  const placedCount=(partners||[]).filter(p=>p.latitude&&p.longitude).length;
  return(
    <div style={{position:'relative',height:'calc(100dvh - 64px)'}}>
      <div ref={mapRef} style={{width:'100%',height:'100%'}}/>
      {placedCount===0&&(
        <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'rgba(253,250,246,.95)',border:'1px solid rgba(107,29,29,.12)',borderRadius:14,padding:'24px 28px',textAlign:'center',zIndex:999,fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:300,color:'#7A6555',maxWidth:280,pointerEvents:'none'}}>
          Aucun partenaire géolocalisé pour l'instant.
        </div>
      )}
      <div style={{position:'absolute',top:12,left:12,zIndex:999}}>
        <button onClick={onBack} style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:500,background:'rgba(253,250,246,.95)',color:'#1C1208',border:'none',borderRadius:8,padding:'8px 14px',cursor:'pointer',boxShadow:'0 2px 8px rgba(0,0,0,.12)'}}>← Retour</button>
      </div>
      <div style={{position:'absolute',bottom:28,right:12,zIndex:999,background:'rgba(253,250,246,.92)',borderRadius:10,padding:'7px 12px',fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:400,color:'#7A6555',boxShadow:'0 2px 8px rgba(0,0,0,.1)'}}>
        {placedCount} partenaire{placedCount!==1?'s':''} sur la carte
      </div>
    </div>
  );
}

export default function App() {
  const{user,profile,authLoading,signOut,setUser:setAuthUser,setProfile:setAuthProfile}=useAuth();
  const[authModal,setAuthModal]=useState({open:false,tab:'login',onSuccess:null});
  const[sessionRenewed,setSessionRenewed]=useState(false);
  const[pendingHotelSlug]=useState(()=>new URLSearchParams(window.location.search).get('hotel')||null);
  function openAuth(tab='login',onSuccess=null){setAuthModal({open:true,tab,onSuccess});}
  function handleAuthSuccess(u,prof){
    // Mise à jour immédiate du nav sans attendre onAuthStateChange
    if(u)setAuthUser(u);
    if(prof)setAuthProfile(prof);
    setAuthModal({open:false,tab:'login',onSuccess:null});
    if(authModal.onSuccess)authModal.onSuccess(u,prof);
  }

  const [page,setPage]=useState(()=>{
    const path=window.location.pathname;
    if(path==="/dashboard"||path.startsWith("/dashboard"))return "dashboard";
    if(path==="/login")return "login";
    if(path==="/rejoindre")return "rejoindre";
    if(path==="/mentions-legales")return "mentions";
    if(path==="/confidentialite")return "confidentialite";
    if(path==="/renouveler")return "renouveler";
    if(path==="/reset-password")return "reset-password";
    if(path==="/comment-ca-marche")return "comment-ca-marche";
    if(path==="/compte")return "compte";
    if(path==="/admin")return "admin";
    if(path.startsWith("/partner/"))return "partner";
    if(path.startsWith("/hotel/"))return "hotel";
    if(path==="/carte")return "carte";
    return "home";
  });
  const [activeCat,setActiveCat]=useState(null);
  const [activePartner,setActivePartner]=useState(null);
  const [supabasePartners,setSupabasePartners]=useState([]);
  useEffect(()=>{
    if(pendingHotelSlug) localStorage.setItem('source_hotel',pendingHotelSlug);
    supabase.from('candidates').select('*').eq('status','approuve').eq('visible',true).then(({data})=>setSupabasePartners(data||[]));
  },[]);
  useEffect(()=>{
    if(!user||!pendingHotelSlug)return;
    const newExpiry=new Date(Date.now()+24*60*60*1000).toISOString();
    supabase.from('profiles').update({session_expires_at:newExpiry}).eq('id',user.id).then(()=>{
      setAuthProfile(p=>({...p,session_expires_at:newExpiry}));
      setSessionRenewed(true);
      setTimeout(()=>setSessionRenewed(false),5000);
    });
  },[user?.id]);
  useEffect(()=>{window.scrollTo(0,0);},[page]);
  useEffect(()=>{
    if(page!=='renouveler'&&window.location.pathname==='/renouveler'){
      window.history.replaceState({},'','/');
    }
  },[page]);
  useEffect(()=>{
    function onPopState(){
      const path=window.location.pathname;
      if(path==="/dashboard"||path.startsWith("/dashboard")){setPage("dashboard");return;}
      if(path==="/login"){setPage("login");return;}
      if(path==="/rejoindre"){setPage("rejoindre");return;}
      if(path==="/mentions-legales"){setPage("mentions");return;}
      if(path==="/confidentialite"){setPage("confidentialite");return;}
      if(path==="/renouveler"){setPage("renouveler");return;}
      if(path==="/reset-password"){setPage("reset-password");return;}
      if(path==="/comment-ca-marche"){setPage("comment-ca-marche");return;}
      if(path==="/compte"){setPage("compte");return;}
      if(path==="/admin"){setPage("admin");return;}
      if(path.startsWith("/partner/")){setPage("partner");return;}
      if(path.startsWith("/hotel/")){setPage("hotel");return;}
      if(path==="/carte"){setPage("carte");return;}
      setPage("home");
    }
    window.addEventListener("popstate",onPopState);
    return ()=>window.removeEventListener("popstate",onPopState);
  },[]);
  function navigate(target,catId=null){if(catId)setActiveCat(catId);setPage(target);}
  function navPartner(pageId,partnerObj){
    if(pageId==='generic'){setActivePartner(partnerObj);setPage('generic');}
    else setPage(pageId);
  }
  if(page==="login")return <LoginView onLogin={p=>{setPage(p);}}/>;
  if(page==="rejoindre")return <JoindreView onHome={()=>{window.history.pushState({},'','/');setPage("home");}}/>;
  if(page==="mentions")return <MentionsLegalesView onHome={()=>{window.history.pushState({},'','/');setPage("home");}}/>;
  if(page==="confidentialite")return <ConfidentialiteView onHome={()=>{window.history.pushState({},'','/');setPage("home");}}/>;
  if(page==="comment-ca-marche")return <CommentCaMarchePage onHome={()=>{window.history.pushState({},'','/');setPage("home");}}/>;
  if(page==="compte"){
    if(authLoading)return <div style={{background:'#F7F3EE',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><style>{CSS}</style><span className="fb" style={{color:'#7A6555',fontSize:13}}>Chargement…</span></div>;
    if(!user||!profile){window.history.pushState({},'','/');setPage("home");return null;}
    return <MonCompteView user={user} profile={profile} setProfile={setAuthProfile} signOut={signOut} onHome={()=>{window.history.pushState({},'','/');setPage("home");}}/>;
  }
  if(page==="admin")return <AdminView/>;
  if(page==="partner")return <PartnerView onLogout={()=>{window.history.pushState({},'','/');setPage("home");}}/>;
  if(page==="hotel")return <HotelView onLogout={()=>setPage("login")}/>;
  return (
    <div style={{background:"#F7F3EE",minHeight:"100vh"}}>
      <style>{CSS}</style>
      <nav className="nav">
        <div className="logo fd" onClick={()=>setPage("home")}>local<em>ly</em></div>
        <ul className="nav-links">
          <li><a onClick={()=>setPage("home")}>Accueil</a></li>
          {page==="category"&&<li><a onClick={()=>setPage("home")}>Catégories</a></li>}
          {page==="generic"&&<li><a onClick={()=>setPage("category")}>{activePartner?.categorie}</a></li>}
        </ul>
        <div style={{display:'flex',alignItems:'center',gap:4}}>
          {!authLoading&&(user&&profile
            ?<>
              <button className="nav-auth-name fb" onClick={()=>siteNav('/carte')}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
                Carte
              </button>
              <span className="nav-auth-name" onClick={()=>siteNav('/compte')}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>{profile.prenom}</span>
            </>
            :<button className="nav-auth-btn fb" onClick={()=>openAuth('login')}>Se connecter</button>
          )}
          <button className="nav-cta fb" onClick={()=>{
            if(page==="home"){document.getElementById("categories")?.scrollIntoView({behavior:"smooth"});}
            else setPage("home");
          }}>
            {page==="home"?"Explorer":"Accueil"}
          </button>
        </div>
      </nav>
      {user&&profile?.session_expires_at&&<div style={{position:'fixed',top:78,left:16,right:16,zIndex:199}}><SessionBar profile={profile} renewed={sessionRenewed} onRenew={()=>siteNav('/renouveler')}/></div>}
      {page==="dashboard"&&<DashboardPage/>}
      {page==="home"&&<HomePage onNavigate={navigate} supabasePartners={supabasePartners}/>}
      {page==="category"&&<CategoryPage categoryId={activeCat} supabasePartners={supabasePartners} onBack={()=>setPage("home")} onNavigate={navPartner}/>}
      {page==="generic"&&activePartner&&<GenericPartnerPage partner={activePartner} onBack={()=>setPage("category")} user={user} profile={profile} onAuthRequired={(cb)=>openAuth('login',cb)}/>}
      {page==="reset-password"&&<ResetPasswordPage onDone={()=>{window.history.pushState({},'','/');setPage("home");}}/>}
      {page==="renouveler"&&<RenouvellerPage profile={profile} onBack={()=>{window.history.pushState({},'','/');setPage("home");}}/>}
      {page==='carte'&&<CartePage partners={supabasePartners} user={user} profile={profile} onNavigatePartner={navPartner} onBack={()=>siteNav('/')}/>}
      {authModal.open&&<AuthModal defaultTab={authModal.tab} onClose={()=>setAuthModal(m=>({...m,open:false}))} onSuccess={handleAuthSuccess}/>}
    </div>
  );
}

